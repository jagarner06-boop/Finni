// Server-side walking-skeleton check without Auth0: bootstrap a test user, ask Finn about balances.
import { runAgent } from "../src/agent/loop.js";
import { bootstrapUser } from "../src/services/users.js";

const user = await bootstrapUser("smoke|test-user", { firstName: "Smokey", email: "smoke@example.com" });
console.log("user", { id: user.id, nessieCustomerId: user.nessieCustomerId });

for (const q of process.argv.slice(2).length ? process.argv.slice(2) : ["How much money do I have?", "Hi Finn! What can you do?"]) {
  const reply = await runAgent(user, q);
  console.log(`\nQ: ${q}\n[${reply.mood}] ${reply.text}\ncards: ${reply.cards.map((c) => c.type).join(", ") || "none"}`);
}
process.exit(0);
