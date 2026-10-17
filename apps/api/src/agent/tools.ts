import type { Card, LatLng } from "@finni/shared";
import { Type, type FunctionDeclaration } from "@google/genai";
import { z } from "zod";
import type { User } from "../db/schema.js";
import { listAccounts } from "../services/accounts.js";

export interface ToolContext {
  user: User;
  location?: LatLng;
  useDemoLocation?: boolean;
  /** Cards emitted by tools during this turn; rendered under Finn's reply. */
  cards: Card[];
}

interface Tool<A extends z.ZodTypeAny = z.ZodTypeAny> {
  declaration: FunctionDeclaration;
  args: A;
  run: (args: z.infer<A>, ctx: ToolContext) => Promise<unknown>;
}

const tool = <A extends z.ZodTypeAny>(t: Tool<A>) => t;

// Registry: Slice A adds read tools, Slice B adds propose_* tools. Each returns JSON for the model
// and may push a card for the UI.
export const TOOLS: Record<string, Tool> = {
  get_accounts: tool({
    declaration: {
      name: "get_accounts",
      description: "List the user's bank accounts with current balances (whole dollars). Use for any balance question.",
      parameters: { type: Type.OBJECT, properties: {} },
    },
    args: z.object({}),
    run: async (_args, ctx) => {
      const accounts = await listAccounts(ctx.user);
      ctx.cards.push({ type: "account_list", accounts });
      return { accounts: accounts.map((a) => ({ id: a.id, nickname: a.nickname, type: a.type, balance: a.balanceCents / 100, isGoal: a.isGoal })) };
    },
  }),
};

export const functionDeclarations = Object.values(TOOLS).map((t) => t.declaration);

export async function runTool(name: string, rawArgs: unknown, ctx: ToolContext): Promise<unknown> {
  const t = TOOLS[name];
  if (!t) return { error: `Unknown tool ${name}` };
  const parsed = t.args.safeParse(rawArgs ?? {});
  if (!parsed.success) return { error: "Invalid arguments", details: parsed.error.flatten() };
  try {
    return await t.run(parsed.data, ctx);
  } catch (err) {
    console.error(`tool ${name} failed`, err);
    return { error: (err as Error).message };
  }
}
