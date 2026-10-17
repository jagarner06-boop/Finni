import { formatCents, type Account, type Bill, type CardSummary, type Goal, type Nudge, type Transaction } from "@finni/shared";
import { shortDate, weekStart } from "../lib/buckets.js";
import { planCardPayment } from "./card.js";
import { cadenceLabel } from "./goals.js";
import { findConvertedTrials, findDuplicateCharges, findSpendingSpikes } from "./insights.js";

// When Finn speaks up on his own. Rules decide when; the copy is fixed templates (no jokes near numbers).

export type NudgeCandidate = Pick<Nudge, "rule" | "title" | "body" | "mood" | "severity" | "face" | "meta" | "highlight" | "action"> & { dedupeKey: string };

export interface NudgeInput {
  today: string;
  card: CardSummary | null;
  checking: Account | null;
  bills: Bill[];
  purchases: Transaction[];
  /** Purchase ids already refunded. */
  refunded: Set<string>;
  goals: Goal[];
}

const TARGET_PCT = 9;
const LOW_BALANCE_CENTS = 10_000;
const BILL_DAYS = 3;
const ORDER = { danger: 0, warning: 1, info: 2 } as const;

const DAY_MS = 86_400_000;
const daysUntil = (date: string, today: string) => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
const when = (days: number) => (days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`);
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const money = formatCents;

const nudge = (c: Omit<NudgeCandidate, "face" | "highlight" | "action"> & Partial<Pick<NudgeCandidate, "face" | "highlight" | "action">>): NudgeCandidate => ({
  face: null,
  highlight: null,
  action: null,
  ...c,
});

export function buildNudges(i: NudgeInput): NudgeCandidate[] {
  const out: NudgeCandidate[] = [];

  if (i.card && i.card.utilization > 30) {
    const amountCents = planCardPayment({ balanceCents: i.card.balanceCents, limitCents: i.card.limitCents, availableCents: i.checking?.balanceCents ?? 0, targetPct: TARGET_PCT });
    if (amountCents > 0) {
      const close = shortDate(i.card.statementCloseDate);
      out.push(
        nudge({
          rule: "high_utilization",
          dedupeKey: `util:${i.card.accountId}:${i.card.statementCloseDate}`,
          severity: i.card.utilization > 60 ? "danger" : "warning",
          mood: "worried",
          title: `Utilization is ${i.card.utilization}%`,
          meta: `${i.card.nickname} · ${money(i.card.balanceCents)} · closes ${close}`,
          body: `I can drop your utilization to ${TARGET_PCT}% before ${close}.`,
          highlight: `${TARGET_PCT}%`,
          action: { type: "propose_card_payment", amountCents, label: "Review plan" },
        }),
      );
    }
  }

  for (const { duplicate: d } of findDuplicateCharges(i.purchases)) {
    if (i.refunded.has(d.id)) continue;
    const date = shortDate(d.date);
    out.push(
      nudge({
        rule: "duplicate_charge",
        dedupeKey: `dup:${d.id}`,
        severity: "danger",
        mood: "worried",
        face: "skeptical",
        title: "Duplicate charge",
        meta: `${d.merchantName} · ${money(d.amountCents)} · ${date}`,
        body: `${d.merchantName} charged you ${money(d.amountCents)} twice on ${date}. I can get the second one back.`,
        highlight: money(d.amountCents),
        action: { type: "propose_dispute", purchaseId: d.id, label: "Get it back" },
      }),
    );
  }

  for (const t of findConvertedTrials(i.purchases, i.today)) {
    // Only while there's a live subscription to cancel; once cancelled, the nudge resolves.
    const sub = i.bills.find((b) => b.status === "recurring" && b.payee.toLowerCase() === t.merchantName.toLowerCase());
    if (!sub) continue;
    out.push(
      nudge({
        rule: "trial_converted",
        dedupeKey: `trial:${t.id}`,
        severity: "warning",
        mood: "worried",
        title: "Free trial converted",
        meta: `${t.merchantName} · ${money(t.amountCents)} · ${shortDate(t.date)}`,
        body: `Your ${t.merchantName} trial turned into a ${money(t.amountCents)} charge. Want me to cancel it?`,
        highlight: money(t.amountCents),
        action: { type: "propose_cancel_subscription", billId: sub.id, label: `Cancel ${t.merchantName}` },
      }),
    );
  }

  for (const b of i.bills) {
    if (b.status !== "pending" || !b.dueDate) continue;
    const days = daysUntil(b.dueDate, i.today);
    if (days < 0 || days > BILL_DAYS) continue;
    const name = b.nickname ?? b.payee;
    out.push(
      nudge({
        rule: "bill_due",
        dedupeKey: `bill_due:${b.id}:${b.dueDate}`,
        severity: "warning",
        mood: "worried",
        title: `${name} due ${when(days)}`,
        meta: `${b.payee} · ${money(b.amountCents)} · ${shortDate(b.dueDate)}`,
        body: `Your ${name} bill of ${money(b.amountCents)} is due ${when(days)}. I can pay it from Checking.`,
        highlight: money(b.amountCents),
        action: { type: "propose_bill_payment", billId: b.id, label: "Review payment" },
      }),
    );
  }

  for (const s of findSpendingSpikes(i.purchases, i.today)) {
    out.push(
      nudge({
        rule: "spending_spike",
        dedupeKey: `spike:${s.category}:${weekStart(i.today)}`,
        severity: "info",
        mood: "worried",
        face: "surprised",
        title: `${capital(s.category)} is up this week`,
        meta: `${money(s.weekCents)} in 7 days`,
        body: `You spent ${money(s.weekCents)} on ${s.category.toLowerCase()} this week. You usually spend about ${money(s.avgWeekCents)}.`,
        highlight: money(s.weekCents),
      }),
    );
  }

  if (i.checking && i.checking.balanceCents < LOW_BALANCE_CENTS) {
    out.push(
      nudge({
        rule: "low_balance",
        dedupeKey: `low:${i.checking.id}:${i.today}`,
        severity: "warning",
        mood: "worried",
        title: "Checking is low",
        meta: `${i.checking.nickname} · ${money(i.checking.balanceCents)}`,
        body: `Checking is down to ${money(i.checking.balanceCents)}.`,
        highlight: money(i.checking.balanceCents),
      }),
    );
  }

  for (const g of i.goals) {
    const m = Math.max(0, ...g.milestonesHit);
    if (m >= 25) {
      out.push(
        nudge({
          rule: "goal_milestone",
          dedupeKey: `milestone:${g.id}:${m}`,
          severity: "info",
          mood: "celebrating",
          title: `${g.name} hit ${m}%`,
          meta: `${money(g.currentCents)} of ${money(g.targetCents)}`,
          body: m >= 100 ? `${g.name} is fully funded.` : `${g.name} is at ${m}%.`,
        }),
      );
    }
    if (g.status === "active" && g.cadence && g.contributionCents && g.nextContributionOn && g.nextContributionOn <= i.today) {
      const amount = money(g.contributionCents);
      out.push(
        nudge({
          rule: "goal_contribution",
          dedupeKey: `contrib:${g.id}:${g.nextContributionOn}`,
          severity: "info",
          mood: "happy",
          title: `Time to add to ${g.name}`,
          meta: `${amount} · ${cadenceLabel(g.cadence)}`,
          body: `Time to move ${amount} to ${g.name}. That keeps your ${cadenceLabel(g.cadence).replace(/ /g, "-")} plan going.`,
          highlight: amount,
          action: { type: "propose_goal_contribution", goalId: g.id, amountCents: g.contributionCents, label: `Move ${amount}` },
        }),
      );
    }
  }

  return out.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}
