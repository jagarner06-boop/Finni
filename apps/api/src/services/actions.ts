import { formatCents, type Card, type CreateActionRequest, type Goal, type PendingAction, type PendingActionSource, type PendingActionStatus } from "@finni/shared";
import { and, desc, eq, gt, inArray, lt } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import type { ActionPayload, ActionRow, BillPaymentPayload, CreateGoalPayload, TransferPayload, User } from "../db/schema.js";
import { env } from "../env.js";
import { nessie } from "../nessie/client.js";
import { listAccounts } from "./accounts.js";
import { findGoalRow, toGoal } from "./goals.js";
import { moveMoney } from "./ledger.js";
import { ownedAccount, ownedBill } from "./ownership.js";
import { HttpError } from "./users.js";

// Pending actions: the only way money moves. Chat tools and UI buttons create them; nothing touches
// Nessie until the user approves (and passes step-up MFA for large amounts).

const EXPIRY_MS = 15 * 60_000;
const MILESTONES = [25, 50, 75, 100];

/** "$60" for whole dollars, "$60.50" otherwise. */
const dollars = (cents: number) => formatCents(cents).replace(/\.00$/, "");
/** Nessie truncates cents, so every movement is rounded to whole dollars. */
const wholeDollars = (cents: number) => Math.round(cents / 100) * 100;
const goalLabel = (g: { name: string }) => g.name;

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
    reason: d.reason,
    requiresStepUp: row.requiresStepUp,
    status: statusOf(row),
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    executedAt: row.executedAt?.toISOString() ?? null,
    error: row.error,
    resultLine: row.resultLine,
    reference: null,
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

export async function createAction(user: User, req: CreateActionRequest, source: PendingActionSource, opts: { nudgeId?: string } = {}): Promise<PendingAction> {
  let payload: ActionPayload;
  let amountCents: number | null;

  switch (req.type) {
    case "transfer": {
      amountCents = wholeDollars(req.amountCents);
      if (amountCents <= 0) throw new HttpError(400, "invalid_amount", "Amount must be at least $1");
      if (req.fromAccountId === req.toAccountId) throw new HttpError(400, "same_account", "From and to accounts must differ");
      const accounts = await listAccounts(user);
      const from = await ownedAccount(user, req.fromAccountId, accounts);
      const to = await ownedAccount(user, req.toAccountId, accounts);
      if (from.balanceCents < amountCents) throw new HttpError(400, "insufficient_funds", `${from.nickname} only has ${formatCents(from.balanceCents)}`);
      payload = {
        fromAccountId: from.id,
        toAccountId: to.id,
        reason: req.reason,
        display: { title: `Move ${dollars(amountCents)} to ${to.nickname}`, fromLabel: from.nickname, toLabel: to.nickname, reason: req.reason },
      };
      break;
    }
    case "bill_payment": {
      const bill = await ownedBill(user, req.billId);
      if (bill.status === "completed" || bill.status === "cancelled") throw new HttpError(409, "bill_not_payable", `That bill is already ${bill.status}`);
      const from = await ownedAccount(user, req.fromAccountId ?? bill.accountId);
      amountCents = bill.amountCents;
      if (from.balanceCents < amountCents) throw new HttpError(400, "insufficient_funds", `${from.nickname} only has ${formatCents(from.balanceCents)}`);
      payload = {
        billId: bill.id,
        fromAccountId: from.id,
        display: { title: `Pay ${bill.nickname ?? bill.payee} bill`, fromLabel: from.nickname, toLabel: bill.payee },
      };
      break;
    }
    case "create_goal": {
      const targetCents = wholeDollars(req.targetCents);
      const name = req.name.trim();
      if (!name) throw new HttpError(400, "invalid_name", "Goal needs a name");
      if (targetCents <= 0) throw new HttpError(400, "invalid_amount", "Target must be at least $1");
      amountCents = null;
      const label = goalLabel({ name });
      payload = {
        name,
        icon: req.icon,
        targetCents,
        targetDate: req.targetDate,
        display: { title: `Start a goal: ${label}`, toLabel: label, reason: `Target ${dollars(targetCents)}${req.targetDate ? ` by ${req.targetDate}` : ""}` },
      };
      break;
    }
    default:
      throw new HttpError(400, "unsupported_action", `Can't create ${req.type} yet`);
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
  await db
    .update(schema.pendingActions)
    .set({ status: "expired" })
    .where(and(eq(schema.pendingActions.userId, user.id), eq(schema.pendingActions.status, "pending"), lt(schema.pendingActions.expiresAt, new Date())));
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
  text: string;
  cards: Card[];
}

/** Step-up (if required) must already have been checked by the route. */
export async function approveAction(user: User, id: string): Promise<PendingAction> {
  // Atomic claim: only one request can move pending → executing, so an action never runs twice.
  const [claimed] = await db
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

  if (!claimed) {
    const current = await getActionRow(user, id);
    if (current.status === "pending") {
      await finish(current, { status: "expired" });
      throw new HttpError(409, "action_expired", "This approval expired. Ask Finn again.");
    }
    throw new HttpError(409, "action_not_pending", `This action is already ${current.status}`);
  }

  try {
    const result = await execute(user, claimed);
    const done = await finish(claimed, { status: "executed", executedAt: new Date(), nessieRef: result.ref });
    await db.insert(schema.chatMessages).values({ userId: user.id, role: "finn", text: result.text, mood: "celebrating", cards: result.cards });
    return toPendingAction(done);
  } catch (err) {
    console.error(`action ${id} failed`, err);
    return toPendingAction(await finish(claimed, { status: "failed", error: (err as Error).message }));
  }
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

/** Saves the final state and updates the approval card in the chat message that proposed it. */
async function finish(row: ActionRow, patch: Partial<Pick<ActionRow, "status" | "executedAt" | "nessieRef" | "error">>): Promise<ActionRow> {
  const [updated] = await db.update(schema.pendingActions).set(patch).where(eq(schema.pendingActions.id, row.id)).returning();
  await syncChatCard(updated);
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
    default:
      throw new Error(`Can't execute ${row.type} yet`);
  }
}

async function executeTransfer(user: User, row: ActionRow, p: TransferPayload): Promise<Execution> {
  const amountCents = row.amountCents!;
  const accounts = await listAccounts(user);
  const from = await ownedAccount(user, p.fromAccountId, accounts);
  const to = await ownedAccount(user, p.toAccountId, accounts);
  // Balances may have changed since the proposal.
  if (from.balanceCents < amountCents) throw new Error(`Not enough in ${from.nickname} (${formatCents(from.balanceCents)})`);

  const moved = await moveMoney({ fromAccountId: from.id, toAccountId: to.id, amountCents, fromLabel: from.nickname, toLabel: to.nickname, ref: row.id });
  const ref = `${moved.withdrawalId},${moved.depositId}`;

  const goalRow = await findGoalRow(user, { nessieAccountId: to.id });
  if (!goalRow) return { ref, text: `Done! Moved ${dollars(amountCents)} from ${from.nickname} to ${to.nickname} 🐟`, cards: [] };

  const { goal, crossed } = await recordGoalProgress(goalRow);
  const label = goalLabel(goal);
  const text = crossed.includes(100)
    ? `You did it! ${label} is fully funded 🎉`
    : crossed.length
      ? `Splash! ${label} just crossed ${Math.max(...crossed)}% 🎉`
      : `Added ${dollars(amountCents)} to ${label}. You're at ${goal.percent}% 🌊`;
  return { ref, text, cards: [{ type: "goal_progress", goals: [goal] }] };
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
  return { ref: withdrawal._id, text: `Paid! Your ${bill.nickname ?? bill.payee} bill (${dollars(amountCents)}) is all set ✅`, cards: [] };
}

async function executeCreateGoal(user: User, p: CreateGoalPayload): Promise<Execution> {
  const label = goalLabel(p);
  const account = await nessie.createAccount(user.nessieCustomerId, { type: "Savings", nickname: label, rewards: 0, balance: 0 });
  const [row] = await db
    .insert(schema.goals)
    .values({ userId: user.id, name: p.name, emoji: p.icon ?? null, targetCents: p.targetCents, targetDate: p.targetDate ?? null, nessieAccountId: account._id })
    .returning();
  return {
    ref: account._id,
    text: `Your ${label} goal is live! Target ${dollars(p.targetCents)}. Let's fill it up 🌊`,
    cards: [{ type: "goal_progress", goals: [await toGoal(row)] }],
  };
}
