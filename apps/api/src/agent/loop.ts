import { MOODS, type Card, type LatLng, type Mood } from "@finni/shared";
import { GoogleGenAI, type Content, type Part } from "@google/genai";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import type { User } from "../db/schema.js";
import { env } from "../env.js";
import { listAccounts } from "../services/accounts.js";
import { systemPrompt } from "./prompt.js";
import { functionDeclarations, runTool, type ToolContext } from "./tools.js";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
const MAX_TOOL_ROUNDS = 5;
const HISTORY_TURNS = 20;
const MAX_RETRY_WAIT_S = 15;

export interface AgentReply {
  text: string;
  mood: Mood;
  cards: Card[];
  /** Pending actions proposed this turn. */
  actionIds: string[];
}

const FALLBACK = { text: "Glub… my brain's a little foggy. Try me again in a sec? 🫧", mood: "worried" as Mood };

export function parseMood(raw: string): { mood: Mood; text: string } {
  const m = raw.match(/^\s*\[mood:\s*(\w+)\s*\]\s*/i);
  const mood = (m && (MOODS as readonly string[]).includes(m[1].toLowerCase()) ? m[1].toLowerCase() : "happy") as Mood;
  // Strip any stray mood tags the model repeats mid-reply.
  const text = (m ? raw.slice(m[0].length) : raw).replace(/\[mood:\s*\w+\s*\]/gi, "").trim();
  return { mood, text };
}

async function loadHistory(userId: string): Promise<Content[]> {
  const rows = await db
    .select({ role: schema.chatMessages.role, text: schema.chatMessages.text })
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.userId, userId))
    .orderBy(desc(schema.chatMessages.createdAt))
    .limit(HISTORY_TURNS);
  return rows.reverse().map((r) => ({ role: r.role === "user" ? "user" : "model", parts: [{ text: r.text }] }));
}

async function generate(contents: Content[], system: string) {
  const request = () =>
    ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents,
      config: { systemInstruction: system, tools: [{ functionDeclarations }], temperature: 0.4 },
    });
  try {
    return await request();
  } catch (err) {
    const status = (err as { status?: number }).status ?? 0;
    if (status !== 429 && status < 500) throw err;
    // Per-minute 429s say how long to wait ("retry in 12.3s"); daily-quota ones say hours, so give up on those.
    const retryIn = Number(/retry in ([\d.]+)s/i.exec((err as Error).message)?.[1] ?? 1.5);
    if (retryIn > MAX_RETRY_WAIT_S || /PerDay/.test((err as Error).message)) throw err;
    await new Promise((r) => setTimeout(r, retryIn * 1000 + 250));
    return request();
  }
}

/** One user turn: history + tool loop → Finn's reply with mood and any cards the tools emitted. */
export async function runAgent(user: User, message: string, opts: { location?: LatLng } = {}): Promise<AgentReply> {
  const ctx: ToolContext = { user, cards: [], actionIds: [], location: opts.location };
  const done = (reply: { text: string; mood: Mood }): AgentReply => ({ ...reply, cards: ctx.cards, actionIds: ctx.actionIds });
  try {
    const [history, accounts] = await Promise.all([loadHistory(user.id), listAccounts(user)]);
    const system = systemPrompt(user, accounts);
    const contents: Content[] = [...history, { role: "user", parts: [{ text: message }] }];

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const res = await generate(contents, system);
      const calls = res.functionCalls ?? [];
      if (calls.length === 0 || round === MAX_TOOL_ROUNDS) {
        const raw = res.text ?? "";
        return done(raw.trim() ? parseMood(raw) : FALLBACK);
      }
      // Keep the model's turn verbatim (Gemini 3 needs its thought signatures echoed back).
      contents.push(res.candidates![0].content!);
      const responses: Part[] = await Promise.all(
        calls.map(async (call) => ({
          functionResponse: { id: call.id, name: call.name!, response: { result: await runTool(call.name!, call.args, ctx) } },
        })),
      );
      contents.push({ role: "user", parts: responses });
    }
    return done(FALLBACK);
  } catch (err) {
    console.error("agent failed", err);
    return done(FALLBACK);
  }
}
