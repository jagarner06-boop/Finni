// Two approvals racing to refund the same duplicate charge: exactly one may run.
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db/client.js";
import { findDuplicateCharges } from "../src/domain/insights.js";
import { approveAction, createAction } from "../src/services/actions.js";
import { getCardSummary } from "../src/services/card.js";
import { listPurchases } from "../src/services/transactions.js";
import { bootstrapUser } from "../src/services/users.js";

const { user: created } = await bootstrapUser(`smoke|race-${Date.now()}`, { firstName: "Alex" });
for (let i = 0; i < 90 && !(await db.query.users.findFirst({ where: eq(schema.users.id, created.id) }))?.seededAt; i++) await new Promise((r) => setTimeout(r, 1000));
const user = (await db.query.users.findFirst({ where: eq(schema.users.id, created.id) }))!;

const dup = findDuplicateCharges(await listPurchases(user, { days: 60 }))[0].duplicate;
const before = (await getCardSummary(user))!.balanceCents;
const [a, b] = await Promise.all([1, 2].map(() => createAction(user, { type: "dispute_charge", purchaseId: dup.id }, "ui")));
const results = await Promise.allSettled([approveAction(user, a.id), approveAction(user, b.id)]);
const executed = results.filter((r) => r.status === "fulfilled" && r.value.status === "executed").length;
const after = (await getCardSummary(user))!.balanceCents;
const ok = executed === 1 && after === before - dup.amountCents;
console.log(`${ok ? "✓" : "✗"} one refund → executed=${executed}, card ${before / 100} → ${after / 100}`, results.map((r) => (r.status === "fulfilled" ? r.value.status : (r.reason as Error).message)));
process.exit(ok ? 0 : 1);
