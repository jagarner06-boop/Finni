import { formatCents, withoutEmoji, type Account, type Card, type CreateActionRequest, type Goal, type PendingAction, type PendingActionSource, type PendingActionStatus } from "@finni/shared";
import { and, desc, eq, gt, inArray, lt } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import type {
  ActionPayload,
  ActionRow,
  BillPaymentPayload,
  CancelSubscriptionPayload,
  CardPaymentPayload,
  CreateGoalPayload,
  DisputePayload,
  TransferPayload,
  User,
} from "../db/schema.js";
import { reference, resultLineFor } from "../domain/actionCopy.js";
import { utilizationPct } from "../domain/card.js";
import { advanceContribution, cadenceLabel, goalEta } from "../domain/goals.js";
import { findDuplicateCharges } from "../domain/insights.js";
import { env } from "../env.js";
import { shortDate } from "../lib/buckets.js";
import { isoDay } from "../lib/dates.js";
import { nessie } from "../nessie/client.js";
import { listAccounts } from "./accounts.js";
import { refundDescription, refundedPurchaseIds } from "./activity.js";
import { getCardSummary } from "./card.js";
import { findGoalRow, toGoal } from "./goals.js";
import { moveMoney } from "./ledger.js";
import { scanNudges } from "./nudges.js";
import { ownedAccount, ownedBill } from "./ownership.js";
import { listPurchases } from "./transactions.js";
import { HttpError } from "./users.js";
import { requireContribution } from './contributions.js';
import { withApprovalLock } from './approvalLock.js';

// Pending actions: the only way money moves. Chat tools and UI buttons create them; nothing touches
// Nessie until the user approves (and passes step-up MFA for large amounts).

const EXPIRY_MS = 15 * 60_000;
const MILESTONES = [25, 50, 75, 100];

/** Nessie truncates cents, so every movement is rounded to whole dollars. */
const wholeDollars = (cents: number) => Math.round(cents / 100) * 100;

const statusOf = (row: ActionRow): PendingActionStatus => (row.status === "pending" && row.expiresAt < new Date() ? "expired" : row.status);

export function toPendingAction(row: ActionRow): PendingAction {
  const d = row.payload.display;
  return {
    id: row.id,
    type: row.type,
    title: d.title,
    amountCents: row.amountCents,
    fromLabel: d.fromLabel,
    toLabel: d.toLabel,
    fromDetail: d.fromDetail,
    toDetail: d.toDetail,
    reason: d.reason,
    requiresStepUp: row.requiresStepUp,
    status: statusOf(row),
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    executedAt: row.executedAt?.toISOString() ?? null,
    error: row.error,
    resultLine: row.resultLine,
    reference: row.status === "executed" ? reference(row.type, row.id) : null,
  };
}

export function toApprovalCard(a: PendingAction): Card {
  return {
    type: "approval",
    actionId: a.id,
    actionType: a.type,
    title: a.title,
    amountCents: a.amountCents,
    fromLabel: a.fromLabel,
    toLabel: a.toLabel,
    requiresStepUp: a.requiresStepUp,
    status: a.status,
    expiresAt: a.expiresAt,
  };
}

// ---------- Create ----------

const available = (a: { mask: string; balanceCents: number }) => `•••• ${a.mask} · ${formatCents(a.balanceCents)} available`;
const monthYear = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

function requireFunds(from: Account, amountCents: number) {
  if (from.type === "Credit Card") throw new HttpError(400, "cannot_pay_from_card", "Money can't move out of a credit card here");
  if (from.balanceCents < amountCents) throw new HttpError(400, "insufficient_funds", `${from.nickname} only has ${formatCents(from.balanceCents)}`);
}

export async function createAction(user: User, req: CreateActionRequest, source: PendingActionSource, opts: { nudgeId?: string } = {}): Promise<PendingAction> {
  let payload: ActionPayload;
  let amountCents: number | null;

  switch (req.type) {
    case "transfer": {
      if (!Number.isSafeInteger(req.amountCents) || req.amountCents % 100 !== 0) throw new HttpError(400, 'invalid_amount', 'Enter a positive amount in whole dollars.');
      amountCents = wholeDollars(req.amountCents);
      if (amountCents <= 0) throw new HttpError(400, "invalid_amount", "Amount must be at least $1");
      if (req.fromAccountId === req.toAccountId) throw new HttpError(400, "same_account", "From and to accounts must differ");
      const accounts = await listAccounts(user);
      const from = await ownedAccount(user, req.fromAccountId, accounts);
      const to = await ownedAccount(user, req.toAccountId, accounts);
      requireFunds(from, amountCents);
      const goalRow = to.isGoal ? await findGoalRow(user, { nessieAccountId: to.id }) : undefined;
      if (goalRow) await requireContribution(user, from, amountCents);
      payload = {
        fromAccountId: from.id,
        toAccountId: to.id,
        reason: req.reason,
        display: {
          title: `Move ${formatCents(amountCents)} to ${to.nickname}`,
          fromLabel: from.nickname,
          toLabel: to.nickname,
          fromDetail: available(from),
          toDetail: goalRow ? `${formatCents(to.balanceCents)} of ${formatCents(goalRow.targetCents)}` : `•••• ${to.mask}`,
          reason: req.reason,
        },
      };
      break;
    }
    case "bill_payment": {
      const bill = await ownedBill(user, req.billId);
      if (bill.status === "completed" || bill.status === "cancelled") throw new HttpError(409, "bill_not_payable", `That bill is already ${bill.status}`);
      const from = await ownedAccount(user, req.fromAccountId ?? (bill.accountId === user.creditAccountId ? user.checkingAccountId : bill.accountId));
      amountCents = bill.amountCents;
      requireFunds(from, amountCents);
      payload = {
        billId: bill.id,
        fromAccountId: from.id,
        display: {
          title: `Pay ${bill.nickname ?? bill.payee} bill`,
          fromLabel: from.nickname,
          toLabel: bill.payee,
          fromDetail: available(from),
          toDetail: bill.dueDate ? `Due ${shortDate(bill.dueDate)}` : undefined,
        },
      };
      break;
    }
    case "card_payment": {
      const card = await getCardSummary(user);
      if (!card) throw new HttpError(409, "no_card", "There's no credit card to pay");
      amountCents = wholeDollars(req.amountCents);
      if (amountCents <= 0) throw new HttpError(400, "invalid_amount", "Amount must be at least $1");
      if (amountCents > card.balanceCents) throw new HttpError(400, "overpayment", `${card.nickname} only owes ${formatCents(card.balanceCents)}`);
      const from = await ownedAccount(user, req.fromAccountId ?? user.checkingAccountId);
      requireFunds(from, amountCents);
      const close = shortDate(card.statementCloseDate);
      payload = {
        fromAccountId: from.id,
        toAccountId: card.accountId,
        display: {
          title: `Pay ${formatCents(amountCents)} to ${card.nickname} before ${close}`,
          fromLabel: from.nickname,
          toLabel: card.nickname,
          fromDetail: available(from),
          toDetail: `•••• ${card.mask} · ${formatCents(card.balanceCents)} owed`,
          reason: `Paying before the statement closes drops your utilization from ${card.utilization}% to ${utilizationPct(card.balanceCents - amountCents, card.limitCents)}%.`,
        },
      };
      break;
    }
    case "dispute_charge": {
      const [purchases, refunded, accounts] = await Promise.all([listPurchases(user, { days: 60 }), refundedPurchaseIds(user), listAccounts(user)]);
      const dup = findDuplicateCharges(purchases).find((d) => d.duplicate.id === req.purchaseId)?.duplicate;
      if (!dup || refunded.has(dup.id)) throw new HttpError(409, "not_a_duplicate", "That charge isn't a duplicate we can get back");
      const account = await ownedAccount(user, dup.accountId, accounts);
      amountCents = dup.amountCents;
      payload = {
        purchaseId: dup.id,
        accountId: account.id,
        merchant: dup.merchantName,
        display: {
          title: `Get ${formatCents(amountCents)} back from ${dup.merchantName}`,
          fromLabel: dup.merchantName,
          toLabel: account.nickname,
          fromDetail: `Charged twice on ${shortDate(dup.date)}`,
          toDetail: `•••• ${account.mask}`,
          reason: `${dup.merchantName} charged you twice on ${shortDate(dup.date)}.`,
        },
      };
      break;
    }
    case "cancel_subscription": {
      const bill = await ownedBill(user, req.billId);
      if (bill.status !== "recurring") throw new HttpError(409, "not_a_subscription", "That isn't a recurring charge");
      amountCents = null;
      payload = {
        billId: bill.id,
        display: {
          title: `Cancel ${bill.payee}`,
          toLabel: bill.payee,
          toDetail: `${formatCents(bill.amountCents)} each month`,
          reason: `Stops the ${formatCents(bill.amountCents)} ${bill.payee} charge each month.`,
        },
      };
      break;
    }
    case "create_goal": {
      const targetCents = wholeDollars(req.targetCents);
      const name = req.name.trim();
      if (!name) throw new HttpError(400, "invalid_name", "Goal needs a name");
      if (targetCents <= 0) throw new HttpError(400, "invalid_amount", "Target must be at least $1");
      const contributionCents = req.cadence && req.contributionCents ? wholeDollars(req.contributionCents) : undefined;
      const from = req.cadence ? await ownedAccount(user, req.fromAccountId ?? user.checkingAccountId) : undefined;
      const eta = req.cadence && contributionCents ? goalEta({ currentCents: 0, targetCents, contributionCents, cadence: req.cadence }, isoDay()) : null;
      amountCents = null;
      payload = {
        name,
        icon: req.icon,
        targetCents,
        targetDate: req.targetDate,
        cadence: req.cadence,
        contributionCents,
        fromAccountId: from?.id,
        display: {
          title: `Start a goal: ${name}`,
          fromLabel: from?.nickname,
          fromDetail: req.cadence && contributionCents ? `${formatCents(contributionCents)} ${cadenceLabel(req.cadence)}` : undefined,
          toLabel: name,
          toDetail: "New savings account · no fees",
          reason:
            eta && req.cadence && contributionCents
              ? `${formatCents(contributionCents)} ${cadenceLabel(req.cadence)} gets you to ${formatCents(targetCents)} by ${monthYear(eta)}.`
              : `Target ${formatCents(targetCents)}${req.targetDate ? ` by ${shortDate(req.targetDate)}` : ""}`,
        },
      };
      break;
    }
  }

  const [row] = await db
    .insert(schema.pendingActions)
    .values({
      userId: user.id,
      type: req.type,
      payload,
      amountCents,
      requiresStepUp: amountCents !== null && amountCents >= env.STEP_UP_THRESHOLD * 100,
      source,
      nudgeId: opts.nudgeId ?? null,
      expiresAt: new Date(Date.now() + EXPIRY_MS),
    })
    .returning();
  return toPendingAction(row);
}

/** Ties actions proposed during a chat turn to Finn's reply, so the reply's card can be kept in sync. */
export async function linkActionsToMessage(actionIds: string[], chatMessageId: string): Promise<void> {
  if (actionIds.length === 0) return;
  await db.update(schema.pendingActions).set({ chatMessageId }).where(inArray(schema.pendingActions.id, actionIds));
}

// ---------- Read ----------

export async function getActionRow(user: User, id: string): Promise<ActionRow> {
  const row = await db.query.pendingActions.findFirst({ where: and(eq(schema.pendingActions.id, id), eq(schema.pendingActions.userId, user.id)) });
  if (!row) throw new HttpError(404, "action_not_found", "No such action");
  return row;
}

export async function listActions(user: User, status?: PendingActionStatus): Promise<PendingAction[]> {
  const expired = await db
    .update(schema.pendingActions)
    .set({ status: "expired" })
    .where(and(eq(schema.pendingActions.userId, user.id), eq(schema.pendingActions.status, "pending"), lt(schema.pendingActions.expiresAt, new Date())))
    .returning();
  // Keep chat history in step: those cards would otherwise still offer Review.
  for (const row of expired) await syncChatCard(row);
  const rows = await db
    .select()
    .from(schema.pendingActions)
    .where(and(eq(schema.pendingActions.userId, user.id), status ? eq(schema.pendingActions.status, status) : undefined))
    .orderBy(desc(schema.pendingActions.createdAt))
    .limit(50);
  return rows.map(toPendingAction);
}

// ---------- Approve / reject ----------

interface Execution {
  ref: string;
  /** Shown on the executed sheet and stored on the action. */
  resultLine: string;
  /** Finn's chat line when it should differ from the result line (milestones). */
  chatText?: string;
  cards: Card[];
}

/** Step-up (if required) must already have been checked by the route. */
const isUniqueViolation = (err: unknown) => (err as { code?: string }).code === "23505" || (err as { cause?: { code?: string } }).cause?.code === "23505";

export async function approveAction(user: User, id: string): Promise<PendingAction> {
  return withApprovalLock(user.id, async () => {
    const fresh = await db.query.users.findFirst({ where: eq(schema.users.id, user.id) });
    if (!fresh) throw new HttpError(404, 'user_not_found', 'User not found');
    return approveActionLocked(fresh, id);
  });
}

async function approveActionLocked(user: User, id: string): Promise<PendingAction> {
  // Atomic claim: only one request can move pending → executing, so an action never runs twice.
  // A unique index also stops two different dispute actions for one purchase from both claiming.
  const claim = db
    .update(schema.pendingActions)
    .set({ status: "executing" })
    .where(
      and(
        eq(schema.pendingActions.id, id),
        eq(schema.pendingActions.userId, user.id),
        eq(schema.pendingActions.status, "pending"),
        gt(schema.pendingActions.expiresAt, new Date()),
      ),
    )
    .returning();
  let claimed: ActionRow | undefined;
  try {
    [claimed] = await claim;
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const row = await getActionRow(user, id);
    return toPendingAction(await finish(row, { status: "failed", error: "That charge was already refunded" }));
  }

  if (!claimed) {
    const current = await getActionRow(user, id);
    if (current.status === "pending") {
      await finish(current, { status: "expired" });
      throw new HttpError(409, "action_expired", "This approval expired. Ask Finn again.");
    }
    throw new HttpError(409, "action_not_pending", `This action is already ${current.status}`);
  }

  let result: Execution;
  try {
    result = await execute(user, claimed);
  } catch (err) {
    console.error(`action ${id} failed`, err);
    return toPendingAction(await finish(claimed, { status: "failed", error: (err as Error).message }));
  }
  // Execution has succeeded. Failure to persist/display a confirmation must never mark money as unmoved.
  const done = await finish(claimed, { status: 'executed', executedAt: new Date(), nessieRef: result.ref, resultLine: withoutEmoji(result.resultLine) });
  try {
    await db.insert(schema.chatMessages).values({ userId: user.id, role: 'finn', text: withoutEmoji(result.chatText ?? result.resultLine), mood: 'celebrating', cards: result.cards });
  } catch (err) { console.error(`action ${id} confirmation failed`, err); }
  void scanNudges(user).catch((err) => console.error('post-action nudge scan failed', err));
  return toPendingAction(done);
}

export async function rejectAction(user: User, id: string): Promise<PendingAction> {
  const [row] = await db
    .update(schema.pendingActions)
    .set({ status: "rejected" })
    .where(and(eq(schema.pendingActions.id, id), eq(schema.pendingActions.userId, user.id), eq(schema.pendingActions.status, "pending")))
    .returning();
  if (!row) throw new HttpError(409, "action_not_pending", `This action is already ${(await getActionRow(user, id)).status}`);
  await syncChatCard(row);
  return toPendingAction(row);
}

/** What an action acts on, when two approvals for it can't both make sense (null = no conflict). */
function targetOf(row: ActionRow): string | null {
  const p = row.payload as Partial<BillPaymentPayload & DisputePayload & CancelSubscriptionPayload>;
  switch (row.type) {
    case "bill_payment":
    case "cancel_subscription":
      return p.billId ? `bill:${p.billId}` : null;
    case "dispute_charge":
      return p.purchaseId ? `purchase:${p.purchaseId}` : null;
    case "card_payment":
      return "card"; // one card per user
    default:
      return null; // transfers and new goals can legitimately repeat
  }
}

/**
 * The same bill can be proposed twice (Finn in chat and the Activity nudge). Once one approval runs,
 * the other would only fail, so it's expired (with its chat card) instead of still offering Review.
 */
async function retireDuplicates(user: User, done: ActionRow): Promise<void> {
  const target = targetOf(done);
  if (!target) return;
  const pending = await db
    .select()
    .from(schema.pendingActions)
    .where(and(eq(schema.pendingActions.userId, user.id), eq(schema.pendingActions.type, done.type), eq(schema.pendingActions.status, "pending")));
  for (const row of pending) if (row.id !== done.id && targetOf(row) === target) await finish(row, { status: "expired", error: "Already handled by another approval" });
}

/** Saves the final state and updates the approval card in the chat message that proposed it. */
async function finish(row: ActionRow, patch: Partial<Pick<ActionRow, "status" | "executedAt" | "nessieRef" | "error" | "resultLine">>): Promise<ActionRow> {
  const [updated] = await db.update(schema.pendingActions).set(patch).where(eq(schema.pendingActions.id, row.id)).returning();
  try { await syncChatCard(updated); }
  catch (err) { console.error(`action ${row.id} card sync failed`, err); }
  return updated;
}

async function syncChatCard(row: ActionRow): Promise<void> {
  if (!row.chatMessageId) return;
  const msg = await db.query.chatMessages.findFirst({ where: eq(schema.chatMessages.id, row.chatMessageId) });
  if (!msg) return;
  const status = statusOf(row);
  const cards = msg.cards.map((c) => (c.type === "approval" && c.actionId === row.id ? { ...c, status } : c));
  await db.update(schema.chatMessages).set({ cards }).where(eq(schema.chatMessages.id, msg.id));
}

// ---------- Executors ----------

function execute(user: User, row: ActionRow): Promise<Execution> {
  switch (row.type) {
    case "transfer":
      return executeTransfer(user, row, row.payload as TransferPayload);
    case "bill_payment":
      return executeBillPayment(user, row, row.payload as BillPaymentPayload);
    case "create_goal":
      return executeCreateGoal(user, row.payload as CreateGoalPayload);
    case "card_payment":
      return executeCardPayment(user, row, row.payload as CardPaymentPayload);
    case "dispute_charge":
      return executeDispute(user, row, row.payload as DisputePayload);
    case "cancel_subscription":
      return executeCancel(user, row.payload as CancelSubscriptionPayload);
  }
}

async function executeTransfer(user: User, row: ActionRow, p: TransferPayload): Promise<Execution> {
  const amountCents = row.amountCents!;
  const accounts = await listAccounts(user);
  const from = await ownedAccount(user, p.fromAccountId, accounts);
  const to = await ownedAccount(user, p.toAccountId, accounts);
  // Balances may have changed since the proposal.
  if (from.balanceCents < amountCents) throw new Error(`Not enough in ${from.nickname} (${formatCents(from.balanceCents)})`);

  const destinationGoal = await findGoalRow(user, { nessieAccountId: to.id });
  if (destinationGoal) await requireContribution(user, from, amountCents);

  const moved = await moveMoney({ fromAccountId: from.id, toAccountId: to.id, amountCents, fromLabel: from.nickname, toLabel: to.nickname, ref: row.id });
  const ref = `${moved.withdrawalId},${moved.depositId}`;
  const resultLine = resultLineFor({ type: "transfer", amountCents, to: to.nickname, from: from.nickname, fromBalanceCents: from.balanceCents - amountCents });

  const goalRow = destinationGoal;
  if (!goalRow) return { ref, resultLine, cards: [] };

  try {
    // A planned contribution (from its nudge) moves the next one forward.
    if (row.nudgeId && goalRow.cadence) {
      await db
        .update(schema.goals)
        .set({ nextContributionOn: advanceContribution(goalRow.nextContributionOn ?? isoDay(), goalRow.cadence) })
        .where(eq(schema.goals.id, goalRow.id));
    }
    const { goal, crossed } = await recordGoalProgress(goalRow);
    const chatText = crossed.includes(100) ? `${goal.name} is fully funded.` : crossed.length ? `${goal.name} just crossed ${Math.max(...crossed)}%.` : resultLine;
    return { ref, resultLine, chatText, cards: [{ type: "goal_progress", goals: [goal] }] };
  } catch (err) {
    // The deposit is already recorded. Progress can be fetched again without repeating the transfer.
    console.error(`action ${row.id} progress refresh failed`, err);
    return { ref, resultLine, cards: [] };
  }
}

/** Records newly crossed 25/50/75/100% milestones; a fully funded goal becomes completed. */
async function recordGoalProgress(row: typeof schema.goals.$inferSelect): Promise<{ goal: Goal; crossed: number[] }> {
  const goal = await toGoal(row);
  const crossed = MILESTONES.filter((m) => goal.percent >= m && !row.milestonesHit.includes(m));
  if (crossed.length === 0) return { goal, crossed };
  const milestonesHit = [...row.milestonesHit, ...crossed];
  const completed = goal.percent >= 100;
  await db
    .update(schema.goals)
    .set({ milestonesHit, ...(completed ? { status: "completed" as const, completedAt: new Date() } : {}) })
    .where(eq(schema.goals.id, row.id));
  return { goal: { ...goal, milestonesHit, status: completed ? "completed" : goal.status }, crossed };
}

async function executeBillPayment(user: User, row: ActionRow, p: BillPaymentPayload): Promise<Execution> {
  const amountCents = row.amountCents!;
  const bill = await ownedBill(user, p.billId);
  if (bill.status === "completed" || bill.status === "cancelled") throw new Error(`That bill is already ${bill.status}`);
  const from = await ownedAccount(user, p.fromAccountId);
  if (from.balanceCents < amountCents) throw new Error(`Not enough in ${from.nickname} (${formatCents(from.balanceCents)})`);

  // Nessie has no "pay bill" endpoint: withdraw the amount, then mark a one-off bill completed.
  const withdrawal = await nessie.createWithdrawal(from.id, { amount: amountCents / 100, description: `Bill payment · ${bill.payee} · ${row.id}` });
  if (bill.status === "pending") await nessie.updateBill(bill.id, { status: "completed" });
  return { ref: withdrawal._id, resultLine: resultLineFor({ type: "bill_payment", amountCents, payee: bill.payee }), cards: [] };
}

async function executeCardPayment(user: User, row: ActionRow, p: CardPaymentPayload): Promise<Execution> {
  const amountCents = row.amountCents!;
  const accounts = await listAccounts(user);
  const from = await ownedAccount(user, p.fromAccountId, accounts);
  const card = await ownedAccount(user, p.toAccountId, accounts);
  if (from.balanceCents < amountCents) throw new Error(`Not enough in ${from.nickname} (${formatCents(from.balanceCents)})`);
  const moved = await moveMoney({ fromAccountId: from.id, toAccountId: card.id, amountCents, fromLabel: from.nickname, toLabel: card.nickname, ref: row.id });
  return { ref: `${moved.withdrawalId},${moved.depositId}`, resultLine: resultLineFor({ type: "card_payment", amountCents, to: card.nickname }), cards: [] };
}

async function executeDispute(user: User, row: ActionRow, p: DisputePayload): Promise<Execution> {
  const amountCents = row.amountCents!;
  if ((await refundedPurchaseIds(user)).has(p.purchaseId)) throw new Error("That charge was already refunded");
  const card = await ownedAccount(user, p.accountId);
  const deposit = await nessie.createDeposit(card.id, { amount: amountCents / 100, description: refundDescription(p.merchant, p.purchaseId) });
  return { ref: deposit._id, resultLine: resultLineFor({ type: "dispute_charge", amountCents, merchant: p.merchant, card: card.nickname }), cards: [] };
}

async function executeCancel(user: User, p: CancelSubscriptionPayload): Promise<Execution> {
  const bill = await ownedBill(user, p.billId);
  if (bill.status !== "recurring") throw new Error(`That subscription is already ${bill.status}`);
  await nessie.updateBill(bill.id, { status: "cancelled" });
  return { ref: bill.id, resultLine: resultLineFor({ type: "cancel_subscription", payee: bill.payee }), cards: [] };
}

async function executeCreateGoal(user: User, p: CreateGoalPayload): Promise<Execution> {
  const account = await nessie.createAccount(user.nessieCustomerId, { type: "Savings", nickname: p.name, rewards: 0, balance: 0 });
  const planned = !!(p.cadence && p.contributionCents);
  const today = isoDay();
  const [row] = await db
    .insert(schema.goals)
    .values({
      userId: user.id,
      name: p.name,
      emoji: p.icon ?? null,
      targetCents: p.targetCents,
      targetDate: p.targetDate ?? null,
      nessieAccountId: account._id,
      cadence: planned ? p.cadence : null,
      contributionCents: planned ? p.contributionCents : null,
      fromAccountId: planned ? (p.fromAccountId ?? user.checkingAccountId) : null,
      nextContributionOn: planned ? today : null,
    })
    .returning();
  let cards: Card[] = [];
  try { cards = [{ type: 'goal_progress', goals: [await toGoal(row)] }]; }
  catch (err) { console.error(`goal ${row.id} initial progress refresh failed`, err); }
  return {
    ref: account._id,
    resultLine: resultLineFor({ type: "create_goal", goal: p.name, ...(planned ? { contributionCents: p.contributionCents, firstDate: today } : {}) }),
    cards,
  };
}
