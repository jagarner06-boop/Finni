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
const goalAcct = accounts.find((a) => a.isGoal)!;

// $60 into Spring Break: 270 → 330 of 600 crosses 50%.
const t = await createAction(user, { type: "transfer", fromAccountId: checking.id, toAccountId: goalAcct.id, amountCents: 6000, reason: "Toward Spring Break" }, "ui");
check("small transfer needs no step-up", !t.requiresStepUp, t.title);
const done = await approveAction(user, t.id);
check("transfer executed", done.status === "executed", done.error);
const after = await listAccounts(user);
check("checking −$60", after.find((a) => a.id === checking.id)!.balanceCents === checking.balanceCents - 6000);
const sb = (await listGoals(user))[0];
check("goal at 55% with 50% milestone", sb.percent === 55 && sb.milestonesHit.includes(50), { percent: sb.percent, milestonesHit: sb.milestonesHit });
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

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
