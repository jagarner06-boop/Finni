import type { CreateActionRequest, Nudge, PendingAction } from "@finni/shared";
import { and, asc, desc, eq, gt, isNull, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import type { NudgeRow, User } from "../db/schema.js";
import { cadenceLabel } from "../domain/goals.js";
import { buildNudges } from "../domain/nudgeRules.js";
import { isoDay } from "../lib/dates.js";
import { listAccounts } from "./accounts.js";
import { createAction, toPendingAction } from "./actions.js";
import { refundedPurchaseIds } from "./activity.js";
import { listBills } from "./bills.js";
import { getCashflow } from "./cashflow.js";
import { getCardSummary } from "./card.js";
import { findGoalRow, listGoals } from "./goals.js";
import { listPurchases } from "./transactions.js";
import { HttpError } from "./users.js";

// Finn's nudges: rules in domain/nudgeRules.ts, stored once per dedupe key. Every scan recomputes what's
// true, and an actionable nudge whose condition is gone (bill paid, charge refunded) gets resolved.

const LAZY_SCAN_MS = 10 * 60_000;

export const toNudge = (r: NudgeRow): Nudge => ({
  id: r.id,
  rule: r.rule,
  title: r.title,
  body: r.body,
  mood: r.mood,
  severity: r.severity,
  face: (r.face as Nudge["face"]) ?? null,
  meta: r.meta,
  highlight: r.highlight,
  action: r.action ?? null,
  notifiedAt: r.notifiedAt?.toISOString() ?? null,
  readAt: r.readAt?.toISOString() ?? null,
  dismissedAt: r.dismissedAt?.toISOString() ?? null,
  resolvedAt: r.resolvedAt?.toISOString() ?? null,
  createdAt: r.createdAt.toISOString(),
});

export async function scanNudges(user: User): Promise<{ created: number }> {
  const [card, accounts, bills, purchases, refunded, goals, forecast] = await Promise.all([
    getCardSummary(user),
    listAccounts(user),
    listBills(user),
    listPurchases(user, { days: 60 }),
    refundedPurchaseIds(user),
    listGoals(user),
    getCashflow(user),
  ]);
  const checking = accounts.find((a) => a.id === user.checkingAccountId) ?? null;
  const candidates = buildNudges({ today: isoDay(), card, checking, bills, purchases, refunded, goals, forecast, savings: accounts.find((a) => a.id === user.savingsAccountId) ?? null });

  const inserted = candidates.length
    ? await db
        .insert(schema.nudges)
        .values(candidates.map((c) => ({ ...c, userId: user.id })))
        .onConflictDoNothing({ target: [schema.nudges.userId, schema.nudges.dedupeKey] })
        .returning({ id: schema.nudges.id })
    : [];

  const live = new Set(candidates.map((c) => c.dedupeKey));
  const open = await db
    .select({ id: schema.nudges.id, dedupeKey: schema.nudges.dedupeKey })
    .from(schema.nudges)
    .where(and(eq(schema.nudges.userId, user.id), isNull(schema.nudges.resolvedAt), isNotNull(schema.nudges.action)));
  for (const n of open) if (!live.has(n.dedupeKey)) await db.update(schema.nudges).set({ resolvedAt: new Date() }).where(eq(schema.nudges.id, n.id));

  await db.update(schema.users).set({ lastNudgeScanAt: new Date() }).where(eq(schema.users.id, user.id));
  return { created: inserted.length };
}

/** Undismissed nudges: open ones first, then by severity, newest first. Scans first when the last scan is stale. */
export async function listNudges(user: User): Promise<Nudge[]> {
  if (!user.lastNudgeScanAt || Date.now() - user.lastNudgeScanAt.getTime() > LAZY_SCAN_MS) await scanNudges(user);
  const rows = await db
    .select()
    .from(schema.nudges)
    .where(and(eq(schema.nudges.userId, user.id), isNull(schema.nudges.dismissedAt)))
    // Severity sorts by enum order: danger, warning, info.
    .orderBy(asc(sql`${schema.nudges.resolvedAt} is not null`), asc(schema.nudges.severity), desc(schema.nudges.createdAt));
  return rows.map(toNudge);
}

async function ownedNudge(user: User, id: string): Promise<NudgeRow> {
  const row = await db.query.nudges.findFirst({ where: and(eq(schema.nudges.id, id), eq(schema.nudges.userId, user.id)) });
  if (!row) throw new HttpError(404, "nudge_not_found", "No such nudge");
  return row;
}

export async function markNudge(user: User, id: string, field: "readAt" | "notifiedAt" | "dismissedAt"): Promise<void> {
  await ownedNudge(user, id);
  await db.update(schema.nudges).set({ [field]: new Date() }).where(eq(schema.nudges.id, id));
}

/** The approval a nudge's button opens. Tapping twice returns the same pending action. */
export async function actOnNudge(user: User, id: string): Promise<PendingAction> {
  const nudge = await ownedNudge(user, id);
  if (!nudge.action) throw new HttpError(409, "nudge_not_actionable", "Nothing to do for this one");
  if (nudge.resolvedAt) throw new HttpError(409, "nudge_resolved", "This is already taken care of");

  const existing = await db.query.pendingActions.findFirst({
    where: and(eq(schema.pendingActions.nudgeId, id), eq(schema.pendingActions.status, "pending"), gt(schema.pendingActions.expiresAt, new Date())),
  });
  if (existing) return toPendingAction(existing);

  const a = nudge.action;
  let req: CreateActionRequest;
  switch (a.type) {
    case "propose_transfer":
      req = { type: "transfer", fromAccountId: a.fromAccountId, toAccountId: a.toAccountId, amountCents: a.amountCents, reason: "Cover upcoming bills" };
      break;
    case "propose_bill_payment":
      req = { type: "bill_payment", billId: a.billId };
      break;
    case "propose_card_payment":
      req = { type: "card_payment", amountCents: a.amountCents };
      break;
    case "propose_dispute":
      req = { type: "dispute_charge", purchaseId: a.purchaseId };
      break;
    case "propose_cancel_subscription":
      req = { type: "cancel_subscription", billId: a.billId };
      break;
    case "propose_goal_contribution": {
      const goal = await findGoalRow(user, { id: a.goalId });
      if (!goal) throw new HttpError(404, "goal_not_found", "That goal is gone");
      const label = goal.cadence ? cadenceLabel(goal.cadence) : "planned";
      req = {
        type: "transfer",
        fromAccountId: goal.fromAccountId ?? user.checkingAccountId,
        toAccountId: goal.nessieAccountId,
        amountCents: a.amountCents,
        reason: `${label.charAt(0).toUpperCase()}${label.slice(1)} contribution`,
      };
      break;
    }
  }
  const action = await createAction(user, req, "nudge", { nudgeId: id });
  await db.update(schema.nudges).set({ readAt: nudge.readAt ?? new Date() }).where(eq(schema.nudges.id, id));
  return action;
}
