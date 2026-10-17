// Approval flow check without Auth0 or Gemini: fresh seeded user → propose → approve/reject → verify Nessie.
import type { Request } from "express";
import { ID_TOKEN_HEADER, MFA_AT_CLAIM } from "@finni/shared";
import { desc, eq } from "drizzle-orm";
import { requireStepUp } from "../src/auth.js";
import { db, schema } from "../src/db/client.js";
import { listAccounts } from "../src/services/accounts.js";
import { approveAction, createAction, rejectAction } from "../src/services/actions.js";
import { listBills } from "../src/services/bills.js";
import { listGoals } from "../src/services/goals.js";
import { getCardSummary } from "../src/services/card.js";
import { actOnNudge, listNudges, scanNudges } from "../src/services/nudges.js";
import { bootstrapUser } from "../src/services/users.js";

let failed = 0;
const check = (label: string, ok: boolean, detail?: unknown) => {
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail === undefined ? "" : ` → ${JSON.stringify(detail)}`}`);
};
const rejects = async (p: Promise<unknown>) => p.then(() => null, (e: { code?: string }) => e.code ?? "error");

const { user } = await bootstrapUser(`smoke|actions-${Date.now()}`, { firstName: "Alex" });
for (let i = 0; i < 60 && !(await db.query.users.findFirst({ where: eq(schema.users.id, user.id) }))?.seededAt; i++) await new Promise((r) => setTimeout(r, 1000));

const accounts = await listAccounts(user);
const checking = accounts.find((a) => a.type === "Checking")!;
const savings = accounts.find((a) => a.nickname === "Rainy Day")!;
const goalAcct = accounts.find((a) => a.nickname === "Car repair")!;

// $360 into Car repair: 420 → 780 of 1,500 crosses 50%.
const t = await createAction(user, { type: "transfer", fromAccountId: checking.id, toAccountId: goalAcct.id, amountCents: 36000, reason: "Toward Car repair" }, "ui");
check("transfer shows from and to details", !!t.fromDetail?.includes("available") && t.toDetail === "$420.00 of $1,500.00", [t.fromDetail, t.toDetail]);
const done = await approveAction(user, t.id);
check("transfer executed", done.status === "executed", done.error);
const after = await listAccounts(user);
check("checking −$360", after.find((a) => a.id === checking.id)!.balanceCents === checking.balanceCents - 36000);
check("result line and reference", !!done.resultLine?.startsWith("$360.00 is in Car repair.") && /^#TR-\d{5}$/.test(done.reference ?? ""), [done.resultLine, done.reference]);
const sb = (await listGoals(user)).find((g) => g.name === "Car repair")!;
check("goal at 52% with 50% milestone", sb.percent === 52 && sb.milestonesHit.includes(50), { percent: sb.percent, milestonesHit: sb.milestonesHit });
const [celebration] = await db.select().from(schema.chatMessages).where(eq(schema.chatMessages.userId, user.id)).orderBy(desc(schema.chatMessages.createdAt)).limit(1);
check("celebration message posted", celebration?.mood === "celebrating", celebration?.text);
check("double approve → 409", (await rejects(approveAction(user, t.id))) === "action_not_pending");

// Bill payment marks the one-off bill completed.
const phone = (await listBills(user)).find((b) => b.nickname === "Phone")!;
const pay = await approveAction(user, (await createAction(user, { type: "bill_payment", billId: phone.id }, "ui")).id);
check("bill paid", pay.status === "executed" && (await listBills(user)).find((b) => b.id === phone.id)?.status === "completed", pay.error);

// Large transfer requires step-up; the route checks the MFA claim.
const big = await createAction(user, { type: "transfer", fromAccountId: checking.id, toAccountId: savings.id, amountCents: 20000 }, "ui");
check("$200 transfer requires step-up", big.requiresStepUp);
const fakeReq = (payload: Record<string, unknown>, headers: Record<string, string> = {}) =>
  ({ auth: { payload: { sub: user.auth0Sub, ...payload } }, header: (name: string) => headers[name.toLowerCase()] }) as unknown as Request;
check("no proof → 403", (await rejects(requireStepUp(fakeReq({})))) === "step_up_required");
check("fresh MFA claim passes", (await rejects(requireStepUp(fakeReq({ [MFA_AT_CLAIM]: Math.floor(Date.now() / 1000) })))) === null);
check("garbage ID token → 403", (await rejects(requireStepUp(fakeReq({}, { [ID_TOKEN_HEADER]: "not.a.jwt" })))) === "step_up_required");
check("reject works", (await rejectAction(user, big.id)).status === "rejected");

// Over-balance proposals are refused up front.
check("insufficient funds refused", (await rejects(createAction(user, { type: "transfer", fromAccountId: savings.id, toAccountId: checking.id, amountCents: 99_900 }, "ui"))) === "insufficient_funds");

// New goal = new Nessie account + goals row.
const g = await approveAction(user, (await createAction(user, { type: "create_goal", name: "Laptop", icon: "book", targetCents: 90000, targetDate: "2027-05-01" }, "ui")).id);
const goals = await listGoals(user);
check("goal created", g.status === "executed" && goals.some((x) => x.name === "Laptop" && x.currentCents === 0), goals.map((x) => x.name));

// ---- Live-app actions: card plan, dispute, cancel, goal with a plan ----
const fresh = (await db.query.users.findFirst({ where: eq(schema.users.id, user.id) }))!;
await scanNudges(fresh);
const openRules = async () => (await listNudges({ ...fresh, lastNudgeScanAt: new Date() })).filter((n) => !n.resolvedAt).map((n) => n.rule);
const settle = () => new Promise((r) => setTimeout(r, 4000)); // post-approval scan runs in the background

const planNudge = (await listNudges({ ...fresh, lastNudgeScanAt: new Date() })).find((n) => n.rule === "high_utilization")!;
const plan = await actOnNudge(fresh, planNudge.id);
check("card plan proposed", plan.type === "card_payment" && plan.requiresStepUp && !!plan.reason?.includes("to 9%"), plan.reason);
const paid = await approveAction(fresh, plan.id);
const card = (await getCardSummary(fresh))!;
check("card paid down to 9%", paid.status === "executed" && card.utilization === 9, { owed: card.balanceCents / 100, utilization: card.utilization, error: paid.error });
await settle();
check("utilization nudge resolved", !(await openRules()).includes("high_utilization"));

const dupNudge = (await listNudges({ ...fresh, lastNudgeScanAt: new Date() })).find((n) => n.rule === "duplicate_charge")!;
const dispute = await actOnNudge(fresh, dupNudge.id);
const owedBefore = card.balanceCents;
const refunded = await approveAction(fresh, dispute.id);
check("duplicate refunded on the card", refunded.status === "executed" && (await getCardSummary(fresh))!.balanceCents === owedBefore - 1500, refunded.resultLine);
check("second dispute refused", (await rejects(createAction(fresh, { type: "dispute_charge", purchaseId: (dupNudge.action as { purchaseId: string }).purchaseId }, "ui"))) === "not_a_duplicate");

const hulu = (await listBills(fresh)).find((b) => b.payee === "Hulu")!;
const cancel = await approveAction(fresh, (await createAction(fresh, { type: "cancel_subscription", billId: hulu.id }, "ui")).id);
check("Hulu cancelled", cancel.status === "executed" && !(await listBills(fresh)).some((b) => b.id === hulu.id), cancel.resultLine);
await settle();
check("dispute and trial nudges resolved", !(await openRules()).some((r) => r === "duplicate_charge" || r === "trial_converted"), await openRules());

const planned = await approveAction(fresh, (await createAction(fresh, { type: "create_goal", name: "Hawaii Two", icon: "sun", targetCents: 240_000, cadence: "weekly", contributionCents: 5_000 }, "ui")).id);
const hawaii2 = (await listGoals(fresh)).find((g) => g.name === "Hawaii Two")!;
check("planned goal has cadence and eta", planned.status === "executed" && hawaii2.cadence === "weekly" && !!hawaii2.eta, { eta: hawaii2.eta, line: planned.resultLine });
await scanNudges(fresh);
const contrib = (await listNudges({ ...fresh, lastNudgeScanAt: new Date() })).find((n) => n.rule === "goal_contribution" && n.title.includes("Hawaii Two"));
check("contribution nudge for the new goal", !!contrib);
const moved = await approveAction(fresh, (await actOnNudge(fresh, contrib!.id)).id);
const next = (await listGoals(fresh)).find((g) => g.name === "Hawaii Two")!;
check("contribution moves the next date a week out", moved.status === "executed" && next.nextContributionOn! > hawaii2.nextContributionOn!, [hawaii2.nextContributionOn, next.nextContributionOn]);
await settle();

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
