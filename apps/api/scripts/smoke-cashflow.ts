// Fresh persona -> forecast -> shortfall -> pending approval. Never approves the transfer.
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db/client.js";
import { nessie } from "../src/nessie/client.js";
import { merchantIds } from "../src/seed/merchants.js";
import { getCashflow } from "../src/services/cashflow.js";
import { actOnNudge, listNudges, scanNudges } from "../src/services/nudges.js";
import { bootstrapUser } from "../src/services/users.js";

let failed = 0;
const check = (label: string, ok: boolean, detail?: unknown) => {
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail === undefined ? "" : ` → ${JSON.stringify(detail)}`}`);
};

try {
  let { user } = await bootstrapUser(`smoke|cashflow-${Date.now()}`, { firstName: "Alex" });
  for (let i = 0; i < 60 && !user.seededAt; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    user = (await db.query.users.findFirst({ where: eq(schema.users.id, user.id) }))!;
  }
  check("persona seeding finished", !!user.seededAt);
  if (!user.seededAt) throw new Error("Persona seeding timed out");
  const f = await getCashflow(user);
  check("Checking has a forecast", !!f);
  if (!f) throw new Error("No checking account found");
  check("regular Campus job paycheck is $620", f.paycheck?.source === "Campus job" && f.paycheck.amountCents === 62_000);
  check("Phone is counted", f.commitments.some((c) => c.kind === "bill" && c.label === "Phone"));
  check("safe amount subtracts bills and planned savings", f.safeCents === f.balanceCents - f.billsCents - f.goalsCents);
  await nessie.createPurchase(user.checkingAccountId, { merchant_id: merchantIds().target, amount: (f.balanceCents - f.billsCents) / 100 + 25, description: "Cashflow smoke purchase" });
  await scanNudges(user);
  const n = (await listNudges(user)).find((n) => n.rule === "cash_short" && !n.resolvedAt);
  check("open shortfall offers a $25 transfer", n?.action?.type === "propose_transfer" && n.action.amountCents === 2_500);
  if (n?.action) {
    const action = await actOnNudge(user, n.id);
    check("nudge creates a pending transfer", action.type === "transfer" && action.status === "pending" && action.amountCents === 2_500);
  } else check("nudge creates a pending transfer", false);
} catch (err) {
  check("cashflow smoke completes", false, (err as Error).message);
}
process.exit(failed ? 1 : 0);
