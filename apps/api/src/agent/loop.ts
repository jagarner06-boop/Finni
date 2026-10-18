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
import { findProblem, honestText } from "./guards.js";
import { wantsAction } from "./intent.js";
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
  /** The turn failed; Finn's reply is the canned apology (saved as kind "fallback"). */
  fallback: boolean;
}

const FALLBACK = { text: "Sorry, I'm having trouble answering right now. Please try again in a moment.", mood: "worried" as Mood, chips: DEFAULT_CHIPS };

/**
 * The conversation so far, for Gemini: the user's messages and Finn's own replies only. App lines
 * ("Paid $45.00 to Visible.") and error apologies stay out, so the model never learns that Finn pays.
 */
async function loadHistory(userId: string): Promise<{ contents: Content[]; lastFinnText: string | null }> {
  const rows = await db
    .select({ role: schema.chatMessages.role, text: schema.chatMessages.text, kind: schema.chatMessages.kind })
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.userId, userId))
    .orderBy(desc(schema.chatMessages.createdAt))
    .limit(HISTORY_TURNS);
  const turns = rows.reverse().filter((r) => r.role === "user" || r.kind === "reply");
  const lastFinn = [...turns].reverse().find((r) => r.role === "finn");
  return {
    contents: turns.map((r) => ({ role: r.role === "user" ? "user" : "model", parts: [{ text: r.text }] })),
    lastFinnText: lastFinn?.text ?? null,
  };
}

async function generate(contents: Content[], system: string, forceTools: string[] = [], round = 0) {
  return generateWithFallback(
    (model) => ai.models.generateContent({ model, contents, config: { systemInstruction: system, tools: [{ functionDeclarations }], temperature: 0.4,
      ...(forceTools.length ? { toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY, allowedFunctionNames: forceTools } } } : {}),
    } }),
    { primary: env.GEMINI_MODEL, fallback: env.GEMINI_FALLBACK_MODEL },
    undefined,
    (failure) => console.warn("Gemini generation failed", { ...failure, round }),
  );
}

/** One user turn: history + tool loop → Finn's reply with mood and any cards the tools emitted. */
export async function runAgent(user: User, message: string, opts: { location?: LatLng } = {}): Promise<AgentReply> {
  const ctx: ToolContext = { user, cards: [], actionIds: [], seenCents: new Set(), location: opts.location, canPropose: false };

  // When something was proposed, the text is a fixed summary of the approval cards, never free text.
  const done = (reply: { text: string; mood: Mood; chips: string[] }): AgentReply => {
    const proposals = ctx.cards.filter((c) => c.type === "approval");
    return {
      ...reply,
      ...(proposals.length
        ? {
            text: `${proposals.map((c) => withoutEmoji(c.title).replace(/[.!?]$/, "")).join("; ")}. Tap Review to approve ${proposals.length === 1 ? "it" : "them"}.`,
            mood: "happy" as Mood,
          }
        : {}),
      cards: ctx.cards,
      actionIds: ctx.actionIds,
      fallback: false,
    };
  };

  // Gemini failed mid-turn. A request the user asked for still stands, with done()'s fixed summary
  // ("Start a goal: Laptop. Tap Review to approve it."); otherwise the apology.
  const fail = async (): Promise<AgentReply> =>
    ctx.actionIds.length ? done(FALLBACK) : { ...FALLBACK, cards: ctx.cards, actionIds: [], fallback: true };

  try {
    const [history, accounts, card, alerts] = await Promise.all([
      loadHistory(user.id),
      listAccounts(user),
      getCardSummary(user),
      listNudges(user).then((ns) => ns.filter((n) => !n.resolvedAt)),
    ]);
    // Proposals only when the user asks for something, or says yes to Finn's offer (agent/intent.ts).
    ctx.canPropose = wantsAction(message, history.lastFinnText);
    const system = systemPrompt(user, accounts, { card, alerts });
    const contents: Content[] = [...history.contents, { role: "user", parts: [{ text: message }] }];
    let retried = false;
    let forceTools: string[] = [];
    const results = new Map<string, unknown>();

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const res = await generate(contents, system, forceTools, round);
      forceTools = [];
      const calls = res.functionCalls ?? [];

      // 1. Gemini wants data or to propose something: run the tools and ask again.
      if (calls.length > 0 && round < MAX_TOOL_ROUNDS) {
        // Keep the model's turn verbatim (Gemini 3 needs its thought signatures echoed back).
        contents.push(res.candidates![0].content!);
        const responses: Part[] = [];
        // Sequential calls preserve action ordering and avoid creating duplicate proposals.
        for (const call of calls) {
          const key = `${call.name}:${JSON.stringify(call.args, Object.keys(call.args ?? {}).sort())}`;
          const repeated = call.name?.startsWith("propose_") && results.has(key);
          const result = repeated ? results.get(key) : await runTool(call.name!, call.args, ctx);
          if (call.name?.startsWith("propose_")) results.set(key, result);
          responses.push({ functionResponse: { id: call.id, name: call.name!, response: { result } } });
        }
        contents.push({ role: "user", parts: responses });
        continue;
      }

      // 2. Gemini answered: check the answer before the user sees it (agent/guards.ts).
      const raw = res.text ?? "";
      if (!raw.trim()) return fail();
      const reply = parseReply(raw);
      const turn = { canPropose: ctx.canPropose, proposed: ctx.actionIds.length > 0, toolNames: TOOL_NAMES };
      const problem = findProblem(raw, reply.text, turn);
      if (problem && !retried && round < MAX_TOOL_ROUNDS) {
        retried = true;
        // It wrote "[get_goals]" instead of calling it: make the retry call exactly that tool.
        forceTools = TOOL_NAMES.filter((name) => namesToolInsteadOfCalling(raw, [name]));
        contents.push(res.candidates![0].content!, { role: "user", parts: [{ text: problem }] });
        continue;
      }
      return done({ ...reply, text: honestText(reply.text, turn) });
    }
    return fail();
  } catch (err) {
    console.error("agent failed", err);
    return fail();
  }
}
