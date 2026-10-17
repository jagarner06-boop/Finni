// Server-side agent check without Auth0: bootstrap a seeded test user, run canned prompts, and
// check each one produced the expected card. Pass prompts as args to run your own instead.
// SMOKE_SUB=<sub> reuses an existing user (default: a fresh one per run).
import { eq } from "drizzle-orm";
import { runAgent } from "../src/agent/loop.js";
import { db, schema } from "../src/db/client.js";
import { bootstrapUser } from "../src/services/users.js";

// Expected card type, or "approval:<action type>". null = no card required.
const CANNED: [string, string | null][] = [
  ["How's my card?", "account_list"],
  ["Any weird charges?", null],
  ["Pay my card down", "approval:card_payment"],
  ["Cancel Hulu", "approval:cancel_subscription"],
  ["Chart my spending this month", "chart"],
  ["How much money do I have?", "account_list"],
  ["What did I buy this week?", "transaction_list"],
  ["How much have I spent at Starbucks lately?", "transaction_list"],
  ["How much did I spend on food this month?", "spending_breakdown"],
  ["Where's the nearest ATM?", "atm_list"],
  ["What bills do I have coming up?", "bill_list"],
  ["How are my goals doing?", "goal_progress"],
  ["Put $60 toward my car repair goal", "approval:transfer"],
  ["Pay my phone bill", "approval:bill_payment"],
  ["Make a goal for a laptop, $900 by May 2027, $50 a week", "approval:create_goal"],
];

const { user, created } = await bootstrapUser(process.env.SMOKE_SUB ?? `smoke|agent-${Date.now()}`, { firstName: "Alex", email: "smoke@example.com" });
console.log("user", { id: user.id, created });
for (let i = 0; i < 60 && !(await db.query.users.findFirst({ where: eq(schema.users.id, user.id) }))?.seededAt; i++) await new Promise((r) => setTimeout(r, 1000));

const custom = process.argv.slice(2);
const cases: [string, string | null][] = custom.length ? custom.map((q) => [q, null]) : CANNED;
let failed = 0;
for (const [q, expected] of cases) {
  const reply = await runAgent(user, q);
  const types = reply.cards.map((c) => (c.type === "approval" ? `approval:${c.actionType}` : c.type));
  const plain = !/\p{Extended_Pictographic}/u.test(reply.text) && reply.chips.length >= 2 && reply.chips.length <= 3;
  const ok = plain && (!expected || types.includes(expected));
  if (!ok) failed++;
  console.log(`\n${ok ? "✓" : "✗"} Q: ${q}\n  [${reply.mood}] ${reply.text}\n  chips: ${reply.chips.join(" | ")}\n  cards: ${types.join(", ") || "none"}${expected ? ` (expected ${expected})` : ""}`);
}
console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
