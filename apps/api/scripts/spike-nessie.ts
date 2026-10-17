// Foundation spike: verifies the ledger approach (Nessie balances are fixed at creation, so we derive them).
import { formatCents } from "@finni/shared";
import { nessie } from "../src/nessie/client.js";
import { liveBalanceCents, moveMoney } from "../src/services/ledger.js";

const show = async (label: string, ...ids: string[]) => {
  const out: Record<string, string> = {};
  for (const id of ids) {
    const a = await nessie.getAccount(id);
    out[a.nickname] = `nessie=${a.balance} live=${formatCents(await liveBalanceCents(a))}`;
  }
  console.log(label, out);
};

const customer = await nessie.createCustomer({
  first_name: "Spike",
  last_name: "Ledger",
  address: { street_number: "1", street_name: "University Ave", city: "Gainesville", state: "FL", zip: "32601" },
});
const checking = await nessie.createAccount(customer._id, { type: "Checking", nickname: "Spike checking", rewards: 0, balance: 1000 });
const savings = await nessie.createAccount(customer._id, { type: "Savings", nickname: "Spike savings", rewards: 0, balance: 0 });
await show("start", checking._id, savings._id);

const merchant = await nessie.createMerchant({
  name: "Spike Coffee",
  category: "coffee",
  address: { street_number: "1", street_name: "University Ave", city: "Gainesville", state: "FL", zip: "32601" },
  geocode: { lat: 29.6516, lng: -82.3248 },
});
await nessie.createPurchase(checking._id, { merchant_id: merchant._id, amount: 5.25, description: "latte" });
await show("after $5.25 purchase", checking._id);

await moveMoney({ fromAccountId: checking._id, toAccountId: savings._id, amountCents: 10000, fromLabel: "Spike checking", toLabel: "Spike savings", ref: "spike" });
await show("after $100 move", checking._id, savings._id);

await nessie.createDeposit(checking._id, { amount: 50, description: "paycheck" });
await show("after $50 deposit", checking._id);

const atms = await nessie.getAllAtms();
console.log("ATMs total:", atms.length);
