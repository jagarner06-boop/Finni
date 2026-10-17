import type { Card, LatLng, Mood } from "@finni/shared";
import { FunctionCallingConfigMode, GoogleGenAI, type Content, type Part } from "@google/genai";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import type { User } from "../db/schema.js";
import { env } from "../env.js";
import { listAccounts } from "../services/accounts.js";
import { getCardSummary } from "../services/card.js";
import { listNudges } from "../services/nudges.js";
import { generateWithFallback } from "./generate.js";
import { DEFAULT_CHIPS, namesToolInsteadOfCalling, parseReply, withoutEmoji } from "./parse.js";
import { systemPrompt } from "./prompt.js";
import { functionDeclarations, runTool, type ToolContext } from "./tools.js";

const TOOL_NAMES = functionDeclarations.map((d) => d.name!).filter(Boolean);

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
const MAX_TOOL_ROUNDS = 5;
const HISTORY_TURNS = 20;

export interface AgentReply {
  text: string;
  mood: Mood;
  cards: Card[];
  /** Pending actions proposed this turn. */
  actionIds: string[];
  chips: string[];
}

const FALLBACK = { text: "I can't think straight right now. Try me again in a moment.", mood: "worried" as Mood, chips: DEFAULT_CHIPS };


async function loadHistory(userId: string): Promise<Content[]> {
  const rows = await db
    .select({ role: schema.chatMessages.role, text: schema.chatMessages.text })
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.userId, userId))
    .orderBy(desc(schema.chatMessages.createdAt))
    .limit(HISTORY_TURNS);
  return rows.reverse().map((r) => ({ role: r.role === "user" ? "user" : "model", parts: [{ text: r.text }] }));
}

async function generate(contents: Content[], system: string, forceTools: string[] = []) {
  return generateWithFallback(
    (model) => ai.models.generateContent({ model, contents, config: { systemInstruction: system, tools: [{ functionDeclarations }], temperature: 0.4,
      ...(forceTools.length ? { toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY, allowedFunctionNames: forceTools } } } : {}),
    } }),
    { primary: env.GEMINI_MODEL, fallback: env.GEMINI_FALLBACK_MODEL },
  );
}

/** One user turn: history + tool loop → Finn's reply with mood and any cards the tools emitted. */
export async function runAgent(user: User, message: string, opts: { location?: LatLng } = {}): Promise<AgentReply> {
  const ctx: ToolContext = { user, cards: [], actionIds: [], seenCents: new Set(), location: opts.location };
  const done = (reply: { text: string; mood: Mood; chips: string[] }): AgentReply => {
    const proposals = ctx.cards.filter((c) => c.type === 'approval');
    return { ...reply, ...(proposals.length ? {
      text: `${proposals.map((c) => withoutEmoji(c.title).replace(/[.!?]$/, '')).join('; ')}. Tap Review to approve ${proposals.length === 1 ? 'it' : 'them'}.`,
      mood: 'happy' as Mood,
    } : {}), cards: ctx.cards, actionIds: ctx.actionIds };
  };
  try {
    const [history, accounts, card, alerts] = await Promise.all([
      loadHistory(user.id),
      listAccounts(user),
      getCardSummary(user),
      listNudges(user).then((ns) => ns.filter((n) => !n.resolvedAt)),
    ]);
    const system = systemPrompt(user, accounts, { card, alerts });
    const contents: Content[] = [...history, { role: "user", parts: [{ text: message }] }];
    let nudged = false;
    let forceTools: string[] = [];
    const results = new Map<string, unknown>();

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const res = await generate(contents, system, forceTools);
      forceTools = [];
      const calls = res.functionCalls ?? [];
      if (calls.length === 0 && !nudged && round < MAX_TOOL_ROUNDS && namesToolInsteadOfCalling(res.text ?? "", TOOL_NAMES)) {
        // It wrote "[get_goals]" instead of calling get_goals: send it back once to actually call it.
        nudged = true;
        forceTools = TOOL_NAMES.filter((name) => namesToolInsteadOfCalling(res.text ?? '', [name]));
        contents.push(res.candidates![0].content!, { role: "user", parts: [{ text: "You wrote a tool name instead of calling it. Call the tool now, then answer." }] });
        continue;
      }
      if (calls.length === 0 || round === MAX_TOOL_ROUNDS) {
        const raw = res.text ?? "";
        return done(raw.trim() ? parseReply(raw) : FALLBACK);
      }
      // Keep the model's turn verbatim (Gemini 3 needs its thought signatures echoed back).
      contents.push(res.candidates![0].content!);
      const responses: Part[] = [];
      // Sequential calls preserve action ordering and avoid creating duplicate proposals.
      for (const call of calls) {
        const key = `${call.name}:${JSON.stringify(call.args, Object.keys(call.args ?? {}).sort())}`;
        const repeated = call.name?.startsWith('propose_') && results.has(key);
        const result = repeated ? results.get(key) : await runTool(call.name!, call.args, ctx);
        if (call.name?.startsWith('propose_')) results.set(key, result);
        responses.push({ functionResponse: { id: call.id, name: call.name!, response: { result } } });
      }
      contents.push({ role: "user", parts: responses });
    }
    return done(FALLBACK);
  } catch (err) {
    console.error("agent failed", err);
    return done(FALLBACK);
  }
}
