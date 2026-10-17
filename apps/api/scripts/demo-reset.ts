// Gives an existing login a fresh, fully seeded persona (Seed plan "Demo account & reset").
// Usage: npm run demo:reset -w @finni/api -- <email | auth0 sub | "latest"> [--name Alex]
// Creates a new Nessie customer, repoints the users row, and clears that user's chat, actions, nudges
// and goals. Never touches Nessie's global data (merchants stay).
import { desc, eq, not, like, or } from "drizzle-orm";
import { db, schema } from "../src/db/client.js";
import { listAccounts } from "../src/services/accounts.js";
import { resetPersona } from "../src/services/reset.js";

const args = process.argv.slice(2);
const nameIdx = args.indexOf("--name");
const name = nameIdx >= 0 ? args[nameIdx + 1] : undefined;
const who = args.find((a, i) => !a.startsWith("--") && (nameIdx < 0 || i !== nameIdx + 1));
if (!who) {
  console.error('Usage: demo:reset <email | auth0 sub | "latest"> [--name Alex]');
  process.exit(1);
}

const user =
  who === "latest"
    ? (await db.select().from(schema.users).where(not(like(schema.users.auth0Sub, "smoke|%"))).orderBy(desc(schema.users.createdAt)).limit(1))[0]
    : await db.query.users.findFirst({ where: or(eq(schema.users.email, who), eq(schema.users.auth0Sub, who)) });
if (!user) {
  console.error(`No user matches ${who}`);
  process.exit(1);
}

const firstName = name ?? user.firstName ?? "Friend";
console.log(`resetting ${user.auth0Sub} (${firstName})`);

const fresh = await resetPersona(user, { firstName, wait: true });
for (const a of await listAccounts(fresh)) console.log(`  ${a.nickname.padEnd(16)} $${a.balanceCents / 100}`);
console.log("done — pull to refresh / reopen the app");
process.exit(0);
