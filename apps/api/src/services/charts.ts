import { toCents, type Card } from "@finni/shared";
import type { User } from "../db/schema.js";
import { dayRange, shortDate, weekStart } from "../lib/buckets.js";
import { isoDay } from "../lib/dates.js";
import { nessie } from "../nessie/client.js";
import { liveBalanceCents } from "./ledger.js";
import { spendingSummary } from "./spending.js";
import { listPurchases } from "./transactions.js";

// Chart cards built from real Nessie data. The server computes every number; the model only picks the chart.

export type ChartCard = Extract<Card, { type: "chart" }>;

const MAX_SLICES = 6;

export async function spendingBreakdownChart(user: User, days: number, groupBy: "category" | "merchant"): Promise<ChartCard> {
  const s = await spendingSummary(user, days, groupBy);
  const top = s.items.slice(0, MAX_SLICES - 1);
  const rest = s.items.slice(MAX_SLICES - 1).reduce((sum, i) => sum + i.amountCents, 0);
  const slices = rest > 0 ? [...top, { label: "Other", amountCents: rest }] : top;
  return {
    type: "chart",
    kind: "donut",
    title: `Spending by ${groupBy}`,
    subtitle: `Last ${days} days`,
    labels: slices.map((i) => i.label),
    series: [{ name: "Spent", valuesCents: slices.map((i) => i.amountCents) }],
    totalCents: s.totalCents,
  };
}

/** Daily bars for up to 2 weeks, weekly bars beyond that. */
export async function spendingOverTimeChart(user: User, days: number): Promise<ChartCard> {
  const txs = await listPurchases(user, { days });
  const daily = days <= 14;
  const keys = daily ? dayRange(days) : [...new Set(dayRange(days).map(weekStart))];
  const totals = new Map(keys.map((k) => [k, 0]));
  for (const t of txs) {
    const k = daily ? t.date : weekStart(t.date);
    if (totals.has(k)) totals.set(k, totals.get(k)! + t.amountCents);
  }
  return {
    type: "chart",
    kind: "bar",
    title: "Spending over time",
    subtitle: `${daily ? "Per day" : "Per week"} · last ${days} days`,
    labels: keys.map((k) => (daily ? shortDate(k) : `Wk ${shortDate(k)}`)),
    series: [{ name: "Spent", valuesCents: keys.map((k) => totals.get(k)!) }],
    totalCents: txs.reduce((s, t) => s + t.amountCents, 0),
  };
}

interface LedgerEvent {
  date: string;
  /** Effect on the balance: + money in, − money out. */
  deltaCents: number;
  kind: "deposit" | "withdrawal" | "purchase";
  description: string;
}

/** Every non-cancelled money movement on Checking (same rules as services/ledger.ts). */
async function checkingEvents(user: User): Promise<LedgerEvent[]> {
  const id = user.checkingAccountId;
  const [deposits, withdrawals, purchases] = await Promise.all([nessie.getDeposits(id), nessie.getWithdrawals(id), nessie.getPurchases(id)]);
  const live = <T extends { status: string }>(xs: T[]) => xs.filter((x) => x.status !== "cancelled");
  return [
    ...live(deposits).map((d) => ({ date: d.transaction_date, deltaCents: toCents(d.amount), kind: "deposit" as const, description: d.description ?? "" })),
    ...live(withdrawals).map((w) => ({ date: w.transaction_date, deltaCents: -toCents(w.amount), kind: "withdrawal" as const, description: w.description ?? "" })),
    ...live(purchases).map((p) => ({ date: p.purchase_date, deltaCents: -toCents(p.amount), kind: "purchase" as const, description: p.description ?? "" })),
  ];
}

/** End-of-day Checking balance, rebuilt backwards from today's live balance. */
export async function balanceHistoryChart(user: User, days: number): Promise<ChartCard> {
  const [account, events] = await Promise.all([nessie.getAccount(user.checkingAccountId), checkingEvents(user)]);
  const netByDay = new Map<string, number>();
  for (const e of events) netByDay.set(e.date, (netByDay.get(e.date) ?? 0) + e.deltaCents);

  const range = dayRange(days);
  const balances: number[] = new Array(range.length);
  let balance = await liveBalanceCents(account);
  // Movements dated after today (none expected) would already be in the live balance; undo them first.
  for (const [date, net] of netByDay) if (date > isoDay()) balance -= net;
  for (let i = range.length - 1; i >= 0; i--) {
    balances[i] = balance;
    balance -= netByDay.get(range[i]) ?? 0;
  }
  return {
    type: "chart",
    kind: "line",
    title: `${account.nickname} balance`,
    subtitle: `Last ${days} days`,
    labels: range.map(shortDate),
    series: [{ name: "Balance", valuesCents: balances }],
  };
}

// Moves between the user's own accounts aren't income or spending.
const isOwnTransfer = (e: LedgerEvent) => /^Transfer (to|from) /.test(e.description);

export async function incomeVsSpendingChart(user: User, weeks: number): Promise<ChartCard> {
  const events = (await checkingEvents(user)).filter((e) => !isOwnTransfer(e));
  const keys = [...new Set(dayRange(weeks * 7).map(weekStart))];
  const inflow = new Map(keys.map((k) => [k, 0]));
  const outflow = new Map(keys.map((k) => [k, 0]));
  for (const e of events) {
    const k = weekStart(e.date);
    const bucket = e.deltaCents > 0 ? inflow : outflow;
    if (bucket.has(k)) bucket.set(k, bucket.get(k)! + Math.abs(e.deltaCents));
  }
  return {
    type: "chart",
    kind: "bar",
    title: "Money in vs out",
    subtitle: `Per week · Everyday · last ${weeks} weeks`,
    labels: keys.map((k) => `Wk ${shortDate(k)}`),
    series: [
      { name: "In", valuesCents: keys.map((k) => inflow.get(k)!) },
      { name: "Out", valuesCents: keys.map((k) => outflow.get(k)!) },
    ],
  };
}
