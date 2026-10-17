// Live-app checks without Auth0 or Gemini: fresh seeded user → ledger, insights, nudges against real Nessie.
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db/client.js";
import { findConvertedTrials, findDuplicateCharges } from "../src/domain/insights.js";
import { listLedger } from "../src/services/activity.js";
import { actOnNudge, listNudges, scanNudges } from "../src/services/nudges.js";
import { listPurchases } from "../src/services/transactions.js";
import { bootstrapUser } from "../src/services/users.js";

let failed = 0;
const check = (label: string, ok: boolean, detail?: unknown) => {
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail === undefined ? "" : ` → ${JSON.stringify(detail)}`}`);
};

const { user: created } = await bootstrapUser(`smoke|live-${Date.now()}`, { firstName: "Alex" });
for (let i = 0; i < 90 && !(await db.query.users.findFirst({ where: eq(schema.users.id, created.id) }))?.seededAt; i++) await new Promise((r) => setTimeout(r, 1000));
const user = (await db.query.users.findFirst({ where: eq(schema.users.id, created.id) }))!;

const ledger = await listLedger(user, { days: 60 });
check("ledger has the persona's history", ledger.length > 50, ledger.length);
check("ledger is newest first", ledger.every((e, i) => i === 0 || ledger[i - 1].date >= e.date));
check("purchases are negative", ledger.filter((e) => e.kind === "purchase").every((e) => e.amountCents < 0));
const purchases = await listPurchases(user, { days: 60 });
const today = new Date().toISOString().slice(0, 10);
const dups = findDuplicateCharges(purchases);
check("one duplicate (Spotify)", dups.length === 1 && dups[0].duplicate.merchantName === "Spotify", dups.map((d) => d.duplicate.merchantName));
const trials = findConvertedTrials(purchases, today);
check("one converted trial (Hulu)", trials.length === 1 && trials[0].merchantName === "Hulu", trials.map((t) => t.merchantName));

const first = await scanNudges(user);
const second = await scanNudges(user);
check("scan creates nudges", first.created >= 4, first.created);
check("rescan creates none", second.created === 0, second.created);
const nudges = await listNudges({ ...user, lastNudgeScanAt: new Date() });
const rules = nudges.map((n) => n.rule);
console.log("  nudges:", nudges.map((n) => `${n.severity}:${n.title}`).join(" | "));
for (const r of ["high_utilization", "duplicate_charge", "trial_converted", "bill_due", "goal_contribution"]) check(`has ${r}`, rules.includes(r as never));
const bill = nudges.find((n) => n.rule === "bill_due")!;
const a1 = await actOnNudge(user, bill.id);
const a2 = await actOnNudge(user, bill.id);
check("double tap returns one action", a1.id === a2.id && a1.type === "bill_payment", [a1.id, a2.id]);

export { check, user, failed };
if (process.argv[1]?.endsWith("smoke-live.ts")) {
  console.log(failed ? `\n${failed} failed` : "\nall passed");
  process.exit(failed ? 1 : 0);
}
