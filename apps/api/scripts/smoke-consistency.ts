// Cross-tab consistency without Auth0 or Gemini: one action, every place it shows up.
// Chat card + chat history, Activity nudges and transactions, Home, bills, balances, the approval list.
import type { Card } from "@finni/shared";
import { and, eq } from "drizzle-orm";
import { db, schema } from "../src/db/client.js";
import { buildHome } from "../src/domain/home.js";
import { listAccounts } from "../src/services/accounts.js";
import { approveAction, createAction, linkActionsToMessage, listActions, rejectAction, toApprovalCard } from "../src/services/actions.js";
import { listLedger } from "../src/services/activity.js";
import { listBills } from "../src/services/bills.js";
import { getCardSummary } from "../src/services/card.js";
import { listGoals } from "../src/services/goals.js";
import { actOnNudge, listNudges } from "../src/services/nudges.js";
import { bootstrapUser } from "../src/services/users.js";

let failed = 0;
const check = (label: string, ok: boolean, detail?: unknown) => {
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail === undefined ? "" : ` → ${JSON.stringify(detail)}`}`);
};

const { user: created } = await bootstrapUser(`smoke|consistency-${Date.now()}`, { firstName: "Alex" });
for (let i = 0; i < 90 && !(await db.query.users.findFirst({ where: eq(schema.users.id, created.id) }))?.seededAt; i++) await new Promise((r) => setTimeout(r, 1000));
const user = (await db.query.users.findFirst({ where: eq(schema.users.id, created.id) }))!;

/** What Finn's chat reply would look like after proposing (approval card linked to the message). */
async function proposeInChat(req: Parameters<typeof createAction>[1]) {
  const action = await createAction(user, req, "chat");
  const [msg] = await db.insert(schema.chatMessages).values({ userId: user.id, role: "finn", text: "Tap Review to approve it.", mood: "happy", cards: [toApprovalCard(action)] }).returning();
  await linkActionsToMessage([action.id], msg.id);
  return { action, messageId: msg.id };
}
const chatCardStatus = async (messageId: string) => {
  const msg = await db.query.chatMessages.findFirst({ where: eq(schema.chatMessages.id, messageId) });
  return (msg?.cards.find((c: Card) => c.type === "approval") as Extract<Card, { type: "approval" }> | undefined)?.status;
};
const home = async () =>
  buildHome({
    firstName: user.firstName,
    card: await getCardSummary(user),
    checking: (await listAccounts(user)).find((a) => a.id === user.checkingAccountId) ?? null,
    nudges: await listNudges(user),
    goals: await listGoals(user),
    prefs: user.prefs,
  });

// ---- 1. Same bill from chat and from the Activity nudge; pay it from chat ----
console.log("\n# Pay the phone bill from chat while the nudge also offered it");
const phone = (await listBills(user)).find((b) => b.nickname === "Phone")!;
const phoneNudge = (await listNudges(user)).find((n) => n.rule === "bill_due" && !n.resolvedAt)!;
check("phone bill nudge is open", !!phoneNudge);
const fromNudge = await actOnNudge(user, phoneNudge.id);
const { action: fromChat, messageId } = await proposeInChat({ type: "bill_payment", billId: phone.id });
const checkingBefore = (await listAccounts(user)).find((a) => a.id === user.checkingAccountId)!.balanceCents;

const paid = await approveAction(user, fromChat.id);
check("chat approval executed", paid.status === "executed", paid.error);
check("chat card says executed", (await chatCardStatus(messageId)) === "executed", await chatCardStatus(messageId));
const history = await db.query.chatMessages.findMany({ where: eq(schema.chatMessages.userId, user.id) });
// Finn never says "Paid $45.00…": the card turning to Done is the result in chat.
const finnLines = history.filter((m) => m.role === "finn").map((m) => m.text);
check("no Finn message claims the payment", !finnLines.some((t) => /\bpaid\b|\$45\.00/i.test(t)), finnLines);
// Checked right after approve returns: the app refetches immediately.
const nudgeNow = (await listNudges(user)).find((n) => n.id === phoneNudge.id)!;
check("Activity: phone nudge resolved as soon as approve returns", !!nudgeNow.resolvedAt);
const nudgeAction = (await listActions(user)).find((a) => a.id === fromNudge.id)!;
check("the nudge's duplicate approval is no longer offered", nudgeAction.status !== "pending", nudgeAction.status);
check("Bills: phone marked paid", (await listBills(user)).find((b) => b.id === phone.id)?.status === "completed");
check("Home: phone not in Needs attention", !(await home()).attention.some((n) => n.id === phoneNudge.id));
check("Balances: Everyday down $45", (await listAccounts(user)).find((a) => a.id === user.checkingAccountId)!.balanceCents === checkingBefore - 4500);
check("Activity: payment in transactions", (await listLedger(user, { days: 1 })).some((e) => e.kind === "withdrawal" && e.amountCents === -4500));

// ---- 1b. Approving from Activity doesn't talk in chat ----
console.log("\n# Approve a nudge from Activity");
const before = (await db.query.chatMessages.findMany({ where: eq(schema.chatMessages.userId, user.id) })).length;
const dupNudge = (await listNudges(user)).find((n) => n.rule === "duplicate_charge" && !n.resolvedAt)!;
const refund = await approveAction(user, (await actOnNudge(user, dupNudge.id)).id);
check("nudge approval executed", refund.status === "executed", refund.error);
check("no Finn message for an approval made outside chat", (await db.query.chatMessages.findMany({ where: eq(schema.chatMessages.userId, user.id) })).length === before);

// ---- 2. Not now ----
console.log("\n# Decline a chat proposal");
const goal = (await listGoals(user)).find((g) => g.status === "active")!;
const { action: declined, messageId: declinedMsg } = await proposeInChat({
  type: "transfer",
  fromAccountId: user.checkingAccountId,
  toAccountId: goal.nessieAccountId,
  amountCents: 2000,
});
await rejectAction(user, declined.id);
check("chat card says rejected", (await chatCardStatus(declinedMsg)) === "rejected", await chatCardStatus(declinedMsg));

// ---- 3. Left alone until it expires ----
console.log("\n# Let a chat proposal expire");
const { action: stale, messageId: staleMsg } = await proposeInChat({
  type: "transfer",
  fromAccountId: user.checkingAccountId,
  toAccountId: goal.nessieAccountId,
  amountCents: 1000,
});
await db.update(schema.pendingActions).set({ expiresAt: new Date(Date.now() - 60_000) }).where(and(eq(schema.pendingActions.id, stale.id)));
await listActions(user); // what the app's approvals list does
check("approval list shows it expired", (await listActions(user)).find((a) => a.id === stale.id)?.status === "expired");
check("chat card says expired", (await chatCardStatus(staleMsg)) === "expired", await chatCardStatus(staleMsg));

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
