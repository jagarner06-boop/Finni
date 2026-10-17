import type { Card, LatLng } from "@finni/shared";
import { Type, type FunctionDeclaration } from "@google/genai";
import { z } from "zod";
import type { User } from "../db/schema.js";
import { daysUntil } from "../lib/dates.js";
import { listAccounts } from "../services/accounts.js";
import { createAction, toApprovalCard } from "../services/actions.js";
import { findNearbyAtms } from "../services/atms.js";
import { listBills } from "../services/bills.js";
import { listGoals } from "../services/goals.js";
import { ownedAccount } from "../services/ownership.js";
import { spendingSummary } from "../services/spending.js";
import { listPurchases } from "../services/transactions.js";

export interface ToolContext {
  user: User;
  location?: LatLng;
  /** Cards emitted by tools during this turn; rendered under Finn's reply. */
  cards: Card[];
  /** Pending actions proposed this turn, linked to Finn's reply once it's saved. */
  actionIds: string[];
}

interface Tool<A extends z.ZodTypeAny = z.ZodTypeAny> {
  declaration: FunctionDeclaration;
  args: A;
  run: (args: z.infer<A>, ctx: ToolContext) => Promise<unknown>;
}

const tool = <A extends z.ZodTypeAny>(t: Tool<A>) => t;

/** One card per type per turn (the model sometimes re-calls a tool); approvals always stack. */
function addCard(ctx: ToolContext, card: Card) {
  const i = card.type === "approval" ? -1 : ctx.cards.findIndex((c) => c.type === card.type);
  if (i >= 0) ctx.cards[i] = card;
  else ctx.cards.push(card);
}

// The model sees whole dollars; the API and cards use cents.
const usd = (cents: number) => Math.round(cents) / 100;

const days = (def: number) => z.number().int().min(1).max(90).default(def);

// Read tools run immediately. Write tools (propose_*) only create a pending action + approval card;
// money moves only when the user taps Approve.
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
      addCard(ctx, { type: "account_list", accounts });
      return { accounts: accounts.map((a) => ({ id: a.id, nickname: a.nickname, type: a.type, balance: usd(a.balanceCents), isGoal: a.isGoal })) };
    },
  }),

  get_recent_purchases: tool({
    declaration: {
      name: "get_recent_purchases",
      description: "List the user's recent card purchases, newest first. Use for 'what did I buy', 'how much at <merchant>', or questions about one category.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          days: { type: Type.INTEGER, description: "Look-back window in days (default 7, max 90)." },
          merchant_query: { type: Type.STRING, description: "Optional merchant name or category to filter by, e.g. 'Starbucks' or 'coffee'." },
          account_id: { type: Type.STRING, description: "Optional account id; omit for all accounts." },
          limit: { type: Type.INTEGER, description: "Max purchases to return (default 10, max 25)." },
        },
      },
    },
    args: z.object({ days: days(7), merchant_query: z.string().optional(), account_id: z.string().optional(), limit: z.number().int().min(1).max(25).default(10) }),
    run: async (a, ctx) => {
      if (a.account_id) await ownedAccount(ctx.user, a.account_id);
      const all = await listPurchases(ctx.user, { days: a.days, merchantQuery: a.merchant_query, accountId: a.account_id });
      const shown = all.slice(0, a.limit);
      if (shown.length) addCard(ctx, { type: "transaction_list", title: `${a.merchant_query ? `${a.merchant_query} · ` : ""}Last ${a.days} days`, transactions: shown });
      return {
        count: all.length,
        total: usd(all.reduce((s, t) => s + t.amountCents, 0)),
        purchases: shown.map((t) => ({ date: t.date, merchant: t.merchantName, category: t.category, amount: usd(t.amountCents) })),
      };
    },
  }),

  spending_summary: tool({
    declaration: {
      name: "spending_summary",
      description: "Total spending over a window, broken down by category or merchant. Use for 'how much did I spend', 'where is my money going', 'food spending'.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          days: { type: Type.INTEGER, description: "Look-back window in days (default 30, max 90). 'this week' = 7." },
          group_by: { type: Type.STRING, enum: ["category", "merchant"], description: "Default category." },
        },
      },
    },
    args: z.object({ days: days(30), group_by: z.enum(["category", "merchant"]).default("category") }),
    run: async (a, ctx) => {
      const s = await spendingSummary(ctx.user, a.days, a.group_by);
      if (s.items.length) addCard(ctx, { type: "spending_breakdown", ...s });
      return { days: s.days, total: usd(s.totalCents), breakdown: s.items.map((i) => ({ label: i.label, amount: usd(i.amountCents), percent: i.percent })) };
    },
  }),

  get_bills: tool({
    declaration: {
      name: "get_bills",
      description: "List the user's bills (unpaid first, soonest due first) with their ids. Call this before propose_bill_payment to get the bill id.",
      parameters: {
        type: Type.OBJECT,
        properties: { status: { type: Type.STRING, enum: ["pending", "recurring", "completed"], description: "Optional filter; pending = unpaid one-off bills." } },
      },
    },
    args: z.object({ status: z.enum(["pending", "recurring", "completed"]).optional() }),
    run: async (a, ctx) => {
      const bills = await listBills(ctx.user, a.status);
      if (bills.length) addCard(ctx, { type: "bill_list", bills });
      return {
        bills: bills.map((b) => ({
          id: b.id,
          name: b.nickname ?? b.payee,
          payee: b.payee,
          amount: usd(b.amountCents),
          status: b.status,
          dueDate: b.dueDate,
          dueInDays: b.dueDate ? daysUntil(b.dueDate) : null,
        })),
      };
    },
  }),

  get_goals: tool({
    declaration: {
      name: "get_goals",
      description: "List the user's savings goals with progress. Each goal has its own account (account_id) — contribute with propose_transfer to that account.",
      parameters: { type: Type.OBJECT, properties: {} },
    },
    args: z.object({}),
    run: async (_a, ctx) => {
      const goals = await listGoals(ctx.user);
      if (goals.length) addCard(ctx, { type: "goal_progress", goals });
      return {
        goals: goals.map((g) => ({ id: g.id, account_id: g.nessieAccountId, name: g.name, emoji: g.emoji, target: usd(g.targetCents), saved: usd(g.currentCents), percent: g.percent, targetDate: g.targetDate, status: g.status })),
      };
    },
  }),

  find_nearby_atms: tool({
    declaration: {
      name: "find_nearby_atms",
      description: "Find the closest Capital One ATMs to the user's current location. The location is attached automatically; never ask for it.",
      parameters: { type: Type.OBJECT, properties: {} },
    },
    args: z.object({}),
    run: async (_a, ctx) => {
      // Location comes from the device (request), never from the model.
      const r = await findNearbyAtms(ctx.location);
      addCard(ctx, { type: "atm_list", ...r });
      return { usedDemoLocation: r.usedFallback, note: r.note, atms: r.atms.map((a) => ({ name: a.name, address: a.address, distanceMiles: a.distanceMiles, hours: a.hours })) };
    },
  }),

  propose_transfer: tool({
    declaration: {
      name: "propose_transfer",
      description:
        "Propose moving money between two of the user's accounts (including into a goal's account). Creates an approval card; nothing moves until the user approves.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          from_account_id: { type: Type.STRING, description: "Source account id (usually Checking)." },
          to_account_id: { type: Type.STRING, description: "Destination account id." },
          amount: { type: Type.NUMBER, description: "Whole dollars." },
          reason: { type: Type.STRING, description: "Short reason shown on the card, e.g. 'Toward Spring Break'." },
        },
        required: ["from_account_id", "to_account_id", "amount"],
      },
    },
    args: z.object({ from_account_id: z.string(), to_account_id: z.string(), amount: z.number().positive(), reason: z.string().max(120).optional() }),
    run: async (a, ctx) =>
      propose(ctx, { type: "transfer", fromAccountId: a.from_account_id, toAccountId: a.to_account_id, amountCents: Math.round(a.amount) * 100, reason: a.reason }),
  }),

  propose_bill_payment: tool({
    declaration: {
      name: "propose_bill_payment",
      description: "Propose paying one of the user's bills. Get the bill id from get_bills first. Creates an approval card.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          bill_id: { type: Type.STRING },
          from_account_id: { type: Type.STRING, description: "Optional; defaults to the bill's account." },
        },
        required: ["bill_id"],
      },
    },
    args: z.object({ bill_id: z.string(), from_account_id: z.string().optional() }),
    run: async (a, ctx) => propose(ctx, { type: "bill_payment", billId: a.bill_id, fromAccountId: a.from_account_id }),
  }),

  propose_goal: tool({
    declaration: {
      name: "propose_goal",
      description: "Propose creating a new savings goal (opens a new savings account). Creates an approval card.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Short goal name, e.g. 'Laptop'." },
          target_amount: { type: Type.NUMBER, description: "Whole dollars." },
          target_date: { type: Type.STRING, description: "Optional YYYY-MM-DD." },
          emoji: { type: Type.STRING, description: "One fitting emoji." },
        },
        required: ["name", "target_amount"],
      },
    },
    args: z.object({
      name: z.string().min(1).max(40),
      target_amount: z.number().positive(),
      target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      emoji: z.string().max(8).optional(),
    }),
    run: async (a, ctx) =>
      propose(ctx, { type: "create_goal", name: a.name, targetCents: Math.round(a.target_amount) * 100, targetDate: a.target_date, emoji: a.emoji }),
  }),
};

async function propose(ctx: ToolContext, req: Parameters<typeof createAction>[1]) {
  const action = await createAction(ctx.user, req, "chat");
  ctx.actionIds.push(action.id);
  addCard(ctx, toApprovalCard(action));
  return { proposed: true, title: action.title, amount: action.amountCents === null ? null : usd(action.amountCents), requiresStepUp: action.requiresStepUp };
}

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
