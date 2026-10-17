import type { Card, LatLng } from "@finni/shared";
import { Type, type FunctionDeclaration } from "@google/genai";
import { z } from "zod";
import type { User } from "../db/schema.js";
import { daysUntil } from "../lib/dates.js";
import { listAccounts } from "../services/accounts.js";
import { createAction, toApprovalCard } from "../services/actions.js";
import { findNearbyAtms } from "../services/atms.js";
import { balanceHistoryChart, incomeVsSpendingChart, spendingBreakdownChart, spendingOverTimeChart, type ChartCard } from "../services/charts.js";
import { getCashflow } from "../services/cashflow.js";
import { listBills } from "../services/bills.js";
import { getCardSummary } from "../services/card.js";
import { planCardPayment } from "../domain/card.js";
import { listNudges } from "../services/nudges.js";
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
  /** Every number (in cents) a tool returned this turn; custom charts may only use these. */
  seenCents: Set<number>;
}

interface Tool<A extends z.ZodTypeAny = z.ZodTypeAny> {
  declaration: FunctionDeclaration;
  args: A;
  run: (args: z.infer<A>, ctx: ToolContext) => Promise<unknown>;
}

const tool = <A extends z.ZodTypeAny>(t: Tool<A>) => t;

/** One card per type per turn (the model sometimes re-calls a tool); approvals stack, charts are one per title. */
function addCard(ctx: ToolContext, card: Card) {
  const same = (c: Card) => c.type === card.type && (c.type !== "chart" || card.type !== "chart" || c.title === card.title);
  const i = card.type === "approval" ? -1 : ctx.cards.findIndex(same);
  if (i >= 0) ctx.cards[i] = card;
  else ctx.cards.push(card);
}

// The model sees whole dollars; the API and cards use cents.
const usd = (cents: number) => Math.round(cents) / 100;

const days = (def: number) => z.number().int().min(1).max(90).default(def);

// Read tools run immediately. Write tools (propose_*) only create a pending action + approval card;
// money moves only when the user taps Approve.
export const TOOLS: Record<string, Tool> = {
  safe_to_spend: tool({
    declaration: {
      name: "safe_to_spend",
      description: "How much the user can spend before their next paycheck after bills and planned goal savings. Use for 'can I afford X', 'how much can I spend', 'am I okay until payday'. Pass amount when they name a price.",
      parameters: { type: Type.OBJECT, properties: { amount: { type: Type.NUMBER, description: "Purchase price in dollars (optional)." } } },
    },
    args: z.object({ amount: z.number().positive().optional() }),
    run: async (a, ctx) => {
      const f = await getCashflow(ctx.user);
      if (!f) return { error: "No checking account found." };
      const askedCents = a.amount === undefined ? undefined : Math.round(a.amount * 100);
      addCard(ctx, { type: "safe_to_spend", forecast: f, ...(askedCents === undefined ? {} : { askedCents }) });
      return { checking: usd(f.balanceCents),
        next_paycheck: f.paycheck ? { date: f.paycheck.date, amount: f.paycheck.amountCents === null ? null : usd(f.paycheck.amountCents), from: f.paycheck.source } : null,
        counted_through: f.untilDate, bills_due: usd(f.billsCents), planned_savings: usd(f.goalsCents), safe_to_spend: usd(f.safeCents),
        ...(askedCents === undefined ? {} : { can_afford: askedCents <= f.safeCents, left_after: usd(f.safeCents - askedCents) }),
        ...(f.shortCents > 0 ? { short_by: usd(f.shortCents) } : {}),
        ...(!f.paycheck ? { note: "No regular paycheck found, so this counts the next 14 days." } : {}),
      };
    },
  }),

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

  get_card: tool({
    declaration: {
      name: "get_card",
      description: "The user's credit card: amount owed, limit, utilization, statement close date, and the payment that gets utilization to 9% before it closes.",
      parameters: { type: Type.OBJECT, properties: {} },
    },
    args: z.object({}),
    run: async (_a, ctx) => {
      const card = await getCardSummary(ctx.user);
      if (!card) return { error: "The user has no credit card." };
      const accounts = await listAccounts(ctx.user);
      const checking = accounts.find((a) => a.id === ctx.user.checkingAccountId);
      const cardAccount = accounts.find((a) => a.id === card.accountId);
      if (cardAccount) addCard(ctx, { type: "account_list", accounts: [cardAccount] });
      const plan = planCardPayment({ balanceCents: card.balanceCents, limitCents: card.limitCents, availableCents: checking?.balanceCents ?? 0 });
      return {
        nickname: card.nickname,
        owed: usd(card.balanceCents),
        limit: usd(card.limitCents),
        utilization_percent: card.utilization,
        statement_closes: card.statementCloseDate,
        days_until_close: card.closesInDays,
        payment_to_reach_9_percent: plan > 0 ? usd(plan) : null,
      };
    },
  }),

  get_alerts: tool({
    declaration: {
      name: "get_alerts",
      description: "What Finn has noticed: duplicate charges, converted free trials, high utilization, bills due, spending spikes, low balance, goal contributions due. Each has ids for the matching propose_* tool.",
      parameters: { type: Type.OBJECT, properties: {} },
    },
    args: z.object({}),
    run: async (_a, ctx) => {
      const open = (await listNudges(ctx.user)).filter((n) => !n.resolvedAt);
      return {
        alerts: open.map((n) => ({
          title: n.title,
          detail: n.meta,
          body: n.body,
          ...(n.action?.type === "propose_dispute" ? { purchase_id: n.action.purchaseId } : {}),
          ...(n.action?.type === "propose_cancel_subscription" || n.action?.type === "propose_bill_payment" ? { bill_id: n.action.billId } : {}),
          ...(n.action?.type === "propose_card_payment" ? { suggested_payment: usd(n.action.amountCents) } : {}),
        })),
      };
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
        purchases: shown.map((t) => ({ id: t.id, date: t.date, merchant: t.merchantName, category: t.category, amount: usd(t.amountCents) })),
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
        goals: goals.map((g) => ({ id: g.id, account_id: g.nessieAccountId, name: g.name, icon: g.icon, target: usd(g.targetCents), saved: usd(g.currentCents), percent: g.percent, targetDate: g.targetDate, status: g.status })),
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

  make_chart: tool({
    declaration: {
      name: "make_chart",
      description:
        "Draw a chart from the user's real data and show it under your reply. Use for 'show me', 'chart', 'graph', 'visualize', 'trend', 'over time'. " +
        "spending_breakdown = donut of WHERE money went (by category/merchant); spending_over_time = bars of WHEN money went (per day up to 14 days, else per week) — use it for 'graph my spending this week/month', 'daily spending', 'trend'; " +
        "balance_history = line of the checking balance; income_vs_spending = weekly money in vs out bars.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          chart: { type: Type.STRING, enum: ["spending_breakdown", "spending_over_time", "balance_history", "income_vs_spending"] },
          days: { type: Type.INTEGER, description: "Look-back window in days (default 30, max 90). 'this week' = 7." },
          group_by: { type: Type.STRING, enum: ["category", "merchant"], description: "Only for spending_breakdown (default category)." },
        },
        required: ["chart"],
      },
    },
    args: z.object({
      chart: z.enum(["spending_breakdown", "spending_over_time", "balance_history", "income_vs_spending"]),
      days: days(30),
      group_by: z.enum(["category", "merchant"]).default("category"),
    }),
    run: async (a, ctx) => {
      const card =
        a.chart === "spending_breakdown"
          ? await spendingBreakdownChart(ctx.user, a.days, a.group_by)
          : a.chart === "spending_over_time"
            ? await spendingOverTimeChart(ctx.user, a.days)
            : a.chart === "balance_history"
              ? await balanceHistoryChart(ctx.user, a.days)
              : await incomeVsSpendingChart(ctx.user, Math.max(1, Math.ceil(a.days / 7)));
      addCard(ctx, card);
      return chartSummary(card);
    },
  }),

  make_custom_chart: tool({
    declaration: {
      name: "make_custom_chart",
      description:
        "Chart other data you already fetched THIS turn with another tool (e.g. bills by amount, goal progress, account balances). " +
        "Every value must be a number a tool returned this turn. Prefer make_chart when it covers the request.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          kind: { type: Type.STRING, enum: ["bar", "donut", "line"] },
          labels: { type: Type.ARRAY, items: { type: Type.STRING } },
          values: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "Dollars, one per label." },
          series_name: { type: Type.STRING },
        },
        required: ["title", "kind", "labels", "values"],
      },
    },
    args: z
      .object({
        title: z.string().min(1).max(60),
        kind: z.enum(["bar", "donut", "line"]),
        labels: z.array(z.string().max(40)).min(1).max(12),
        values: z.array(z.number().nonnegative()).min(1).max(12),
        series_name: z.string().max(30).optional(),
      })
      .refine((a) => a.labels.length === a.values.length, "labels and values must have the same length"),
    run: async (a, ctx) => {
      const valuesCents = a.values.map((v) => Math.round(v * 100));
      const unknown = a.values.filter((_, i) => !ctx.seenCents.has(valuesCents[i]));
      if (unknown.length) return { error: `Only chart numbers you got from a tool this turn. Not found: ${unknown.join(", ")}` };
      const card: ChartCard = { type: "chart", kind: a.kind, title: a.title, labels: a.labels, series: [{ name: a.series_name ?? a.title, valuesCents }] };
      if (a.kind === "donut") card.totalCents = valuesCents.reduce((s, v) => s + v, 0);
      addCard(ctx, card);
      return { charted: true, points: a.labels.length };
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
      propose(ctx, { type: "transfer", fromAccountId: a.from_account_id, toAccountId: a.to_account_id, amountCents: Math.round(a.amount * 100), reason: a.reason }),
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

  propose_card_payment: tool({
    declaration: {
      name: "propose_card_payment",
      description: "Propose paying the credit card from Checking. Leave amount out to use the plan that gets utilization to 9% before the statement closes. Creates an approval card.",
      parameters: { type: Type.OBJECT, properties: { amount: { type: Type.NUMBER, description: "Whole dollars (optional)." } } },
    },
    args: z.object({ amount: z.number().positive().optional() }),
    run: async (a, ctx) => {
      let amountCents = a.amount ? Math.round(a.amount) * 100 : 0;
      if (!amountCents) {
        const card = await getCardSummary(ctx.user);
        if (!card) return { error: "The user has no credit card." };
        const checking = (await listAccounts(ctx.user)).find((x) => x.id === ctx.user.checkingAccountId);
        amountCents = planCardPayment({ balanceCents: card.balanceCents, limitCents: card.limitCents, availableCents: checking?.balanceCents ?? 0 });
        if (!amountCents) return { error: `Utilization is already ${card.utilization}% or Checking can't cover a payment right now.` };
      }
      return propose(ctx, { type: "card_payment", amountCents });
    },
  }),

  propose_dispute: tool({
    declaration: {
      name: "propose_dispute",
      description: "Propose getting a duplicate charge refunded. Call get_alerts first: the duplicate's purchase_id is on its alert. Creates an approval card.",
      parameters: { type: Type.OBJECT, properties: { purchase_id: { type: Type.STRING } }, required: ["purchase_id"] },
    },
    args: z.object({ purchase_id: z.string().min(1) }),
    run: (a, ctx) => propose(ctx, { type: "dispute_charge", purchaseId: a.purchase_id }),
  }),

  propose_cancel_subscription: tool({
    declaration: {
      name: "propose_cancel_subscription",
      description: "Propose cancelling a recurring subscription (e.g. a free trial that converted). Get the bill_id from get_bills or get_alerts. Creates an approval card.",
      parameters: { type: Type.OBJECT, properties: { bill_id: { type: Type.STRING } }, required: ["bill_id"] },
    },
    args: z.object({ bill_id: z.string().min(1) }),
    run: (a, ctx) => propose(ctx, { type: "cancel_subscription", billId: a.bill_id }),
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
          icon: { type: Type.STRING, enum: ["sun", "tool", "shield", "home", "book", "gift"], description: "sun = trip, tool = repair, shield = emergency, home, book = school, gift." },
          cadence: { type: Type.STRING, enum: ["weekly", "biweekly", "monthly"], description: "How often to save, if the user said." },
          contribution_amount: { type: Type.NUMBER, description: "Whole dollars per cadence, if the user said." },
        },
        required: ["name", "target_amount"],
      },
    },
    args: z.object({
      name: z.string().min(1).max(40),
      target_amount: z.number().positive(),
      target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      icon: z.enum(["sun", "tool", "shield", "home", "book", "gift"]).optional(),
      cadence: z.enum(["weekly", "biweekly", "monthly"]).optional(),
      contribution_amount: z.number().positive().optional(),
    }),
    run: async (a, ctx) =>
      propose(ctx, { type: "create_goal", name: a.name, targetCents: Math.round(a.target_amount) * 100, targetDate: a.target_date,
        icon: a.icon,
        cadence: a.contribution_amount ? a.cadence : undefined,
        contributionCents: a.cadence && a.contribution_amount ? Math.round(a.contribution_amount) * 100 : undefined,
      }),
  }),
};

async function propose(ctx: ToolContext, req: Parameters<typeof createAction>[1]) {
  const action = await createAction(ctx.user, req, "chat");
  ctx.actionIds.push(action.id);
  addCard(ctx, toApprovalCard(action));
  return { proposed: true, title: action.title, amount: action.amountCents === null ? null : usd(action.amountCents), requiresStepUp: action.requiresStepUp };
}

/** A few numbers about a chart so Finn can say one sentence about what stands out. */
function chartSummary(card: ChartCard) {
  const values = card.series[0].valuesCents;
  const peak = values.indexOf(Math.max(...values));
  const sum = (xs: number[]) => usd(xs.reduce((s, v) => s + v, 0));
  return {
    title: card.title,
    kind: card.kind,
    total: card.totalCents === undefined ? undefined : usd(card.totalCents),
    biggest: { label: card.labels[peak], amount: usd(values[peak]) },
    ...(card.kind === "line" ? { start: usd(values[0]), end: usd(values[values.length - 1]) } : {}),
    ...(card.series[1] ? { totals: { [card.series[0].name]: sum(values), [card.series[1].name]: sum(card.series[1].valuesCents) } } : {}),
  };
}

/** Records every number in a tool result (as cents) so make_custom_chart can only plot real data. */
function recordNumbers(value: unknown, into: Set<number>) {
  if (typeof value === "number") into.add(Math.round(value * 100));
  else if (Array.isArray(value)) value.forEach((v) => recordNumbers(v, into));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => recordNumbers(v, into));
}

export const functionDeclarations = Object.values(TOOLS).map((t) => t.declaration);

export async function runTool(name: string, rawArgs: unknown, ctx: ToolContext): Promise<unknown> {
  const t = TOOLS[name];
  if (!t) return { error: `Unknown tool ${name}` };
  const parsed = t.args.safeParse(rawArgs ?? {});
  if (!parsed.success) return { error: "Invalid arguments", details: parsed.error.flatten() };
  try {
    const result = await t.run(parsed.data, ctx);
    recordNumbers(result, ctx.seenCents);
    return result;
  } catch (err) {
    console.error(`tool ${name} failed`, err);
    return { error: (err as Error).message };
  }
}
