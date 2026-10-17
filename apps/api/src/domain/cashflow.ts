import type { Account, Bill, Cents, CashflowCommitment, CashflowForecast, CashflowPaycheck, FinnProfile, Goal, ISODate } from "@finni/shared";
import { advanceContribution } from "./goals.js";

export interface DepositRecord { date: ISODate; amountCents: Cents; description: string }
export interface CashflowInput { today: ISODate; checking: Account | null; deposits: DepositRecord[]; bills: Bill[]; goals: Goal[]; profile: FinnProfile | null }
const dayMs = 86_400_000;
const dateOf = (date: string) => new Date(`${date}T00:00:00Z`);
const day = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: string, days: number) => day(new Date(dateOf(date).getTime() + days * dayMs));

export function detectPaycheck(deposits: DepositRecord[], today: ISODate): CashflowPaycheck | null {
  const groups = new Map<string, DepositRecord[]>();
  for (const d of deposits) {
    if (d.date < addDays(today, -90) || d.date > today || d.amountCents <= 0) continue;
    const group = groups.get(d.description) ?? [];
    group.push(d);
    groups.set(d.description, group);
  }
  const candidates: { count: number; paycheck: CashflowPaycheck }[] = [];
  for (const [source, group] of groups) {
    if (group.length < 3) continue;
    group.sort((a, b) => a.date.localeCompare(b.date));
    const gaps = group.slice(1).map((d, n) => (dateOf(d.date).getTime() - dateOf(group[n].date).getTime()) / dayMs).sort((a, b) => a - b);
    const mid = Math.floor(gaps.length / 2);
    const median = gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
    if (median < 6 || median > 35 || gaps.some((g) => Math.abs(g - median) > 3)) continue;
    const latest = group[group.length - 1];
    let date = addDays(latest.date, median);
    while (date <= today) date = addDays(date, median);
    candidates.push({ count: group.length, paycheck: { date, amountCents: latest.amountCents, source, basis: "deposits" } });
  }
  candidates.sort((a, b) => b.count - a.count || b.paycheck.amountCents! - a.paycheck.amountCents!);
  return candidates[0]?.paycheck ?? null;
}

function profilePaycheck(profile: FinnProfile | null, today: ISODate): CashflowPaycheck | null {
  if (!profile?.nextPayday) return null;
  let date = profile.nextPayday;
  if (profile.paySchedule === "irregular" && date <= today) return null;
  while (date <= today) {
    if (profile.paySchedule === "semi") {
      const d = dateOf(date);
      date = day(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + (d.getUTCDate() < 15 ? 0 : 1), d.getUTCDate() < 15 ? 15 : 1)));
    } else if (profile.paySchedule !== "irregular") date = advanceContribution(date, profile.paySchedule);
  }
  return { date, amountCents: null, source: "Your payday", basis: "profile" };
}

export function forecastCashflow(i: CashflowInput): CashflowForecast | null {
  if (!i.checking) return null;
  const paycheck = detectPaycheck(i.deposits, i.today) ?? profilePaycheck(i.profile, i.today);
  const untilDate = paycheck ? addDays(paycheck.date, -1) : addDays(i.today, 13);
  const commitments: CashflowCommitment[] = [];
  const addBill = (b: Bill, date: string) => {
    if (date >= i.today && date <= untilDate) commitments.push({ kind: "bill", id: b.id, label: b.nickname ?? b.payee, date, amountCents: b.amountCents });
  };
  for (const b of i.bills) {
    if (b.accountId !== i.checking.id) continue;
    if (b.status === "pending" && b.dueDate) addBill(b, b.dueDate < i.today ? i.today : b.dueDate);
    else if (b.status === "recurring" && b.recurringDate) {
      const month = dateOf(i.today);
      month.setUTCDate(1);
      while (day(month) <= untilDate) {
        const last = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
        addBill(b, day(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), Math.min(b.recurringDate, last)))));
        month.setUTCMonth(month.getUTCMonth() + 1);
      }
    }
  }
  for (const g of i.goals) {
    if (g.status !== "active" || !g.cadence || !g.contributionCents || !g.nextContributionOn) continue;
    let date = g.nextContributionOn < i.today ? i.today : g.nextContributionOn;
    while (date <= untilDate) {
      commitments.push({ kind: "goal", id: g.id, label: g.name, date, amountCents: g.contributionCents });
      date = advanceContribution(date, g.cadence);
    }
  }
  commitments.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === b.kind ? 0 : a.kind === "bill" ? -1 : 1));
  let billsCents = 0, goalsCents = 0;
  let firstShort: CashflowCommitment | null = null;
  for (const c of commitments) {
    if (c.kind === "goal") goalsCents += c.amountCents;
    else {
      billsCents += c.amountCents;
      if (!firstShort && billsCents > i.checking.balanceCents) firstShort = c;
    }
  }
  const balanceCents = i.checking.balanceCents;
  return { balanceCents, paycheck, untilDate, commitments, billsCents, goalsCents, safeCents: balanceCents - billsCents - goalsCents, shortCents: Math.max(0, billsCents - balanceCents), firstShort };
}
