// Settings -> Reset demo data undoes this purchase.
import { desc, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "../src/db/client.js";
import { nessie } from "../src/nessie/client.js";
import { merchantIds } from "../src/seed/merchants.js";
import { getCashflow } from "../src/services/cashflow.js";
import { listNudges, scanNudges } from "../src/services/nudges.js";

try {
  const subIndex = process.argv.indexOf("--sub");
  const sub = subIndex < 0 ? undefined : process.argv[subIndex + 1];
  if (subIndex >= 0 && (!sub || sub.startsWith("--"))) throw new Error("Usage: demo:short [--sub <auth0Sub>]");
  const user = await db.query.users.findFirst({
    where: sub ? eq(schema.users.auth0Sub, sub) : isNotNull(schema.users.seededAt),
    orderBy: desc(schema.users.seededAt),
  });
  if (!user?.seededAt) throw new Error("No seeded user found. Finish signing in first.");
  const f = await getCashflow(user);
  if (!f) throw new Error("No checking account found.");
  if (f.shortCents < 2_500) await nessie.createPurchase(user.checkingAccountId, {
    merchant_id: merchantIds().target, amount: (f.balanceCents - f.billsCents) / 100 + 25, description: "Cashflow demo purchase",
  });
  await scanNudges(user);
  const n = (await listNudges(user)).find((n) => n.rule === "cash_short" && !n.resolvedAt);
  if (!n) throw new Error("No shortfall nudge found.");
  console.log(`${n.title}\n${n.body}\n\nPull to refresh Activity. Settings > Reset demo data undoes this purchase.`);
  process.exit(0);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
