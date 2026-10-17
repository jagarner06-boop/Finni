// Bootstraps a brand-new user, waits for persona seeding, and prints balances + history counts.
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db/client.js";
import { nessie } from "../src/nessie/client.js";
import { listAccounts } from "../src/services/accounts.js";
import { getCardSummary } from "../src/services/card.js";
import { listGoals } from "../src/services/goals.js";
import { bootstrapUser } from "../src/services/users.js";

const started = Date.now();
const { user, created } = await bootstrapUser(`smoke|seed-${Date.now()}`, { firstName: "Alex", email: "alex@example.com" });
console.log("bootstrapped", { created, ms: Date.now() - started, nessieCustomerId: user.nessieCustomerId });

let seeded = false;
while (!seeded && Date.now() - started < 60_000) {
  await new Promise((r) => setTimeout(r, 1000));
  seeded = !!(await db.query.users.findFirst({ where: eq(schema.users.id, user.id) }))?.seededAt;
}
console.log("seeded", { seeded, ms: Date.now() - started });

for (const a of await listAccounts(user)) console.log(`  ${a.nickname.padEnd(16)} ${a.type.padEnd(8)} $${a.balanceCents / 100}${a.isGoal ? " (goal)" : ""}`);
const fresh = (await db.query.users.findFirst({ where: eq(schema.users.id, user.id) }))!;
const card = await getCardSummary(fresh);
console.log("card", card && { owed: card.balanceCents / 100, limit: card.limitCents / 100, utilization: card.utilization, closesInDays: card.closesInDays });
console.log("goals", (await listGoals(fresh)).map((g) => `${g.name} ${g.percent}% ${g.status}`));
console.log("purchases", (await nessie.getPurchases(user.checkingAccountId)).length, "bills", (await nessie.getCustomerBills(user.nessieCustomerId)).length);
process.exit(0);
