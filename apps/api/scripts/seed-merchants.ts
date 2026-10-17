// One-time global seed: creates Finni's merchants in Nessie and records their IDs.
// Re-running keeps existing IDs and only creates merchants that are missing.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { nessie } from "../src/nessie/client.js";
import { MERCHANT_KEYS, MERCHANT_SEEDS, MERCHANTS_FILE, type MerchantKey } from "../src/seed/merchants.js";

const ids: Partial<Record<MerchantKey, string>> = existsSync(MERCHANTS_FILE) ? JSON.parse(readFileSync(MERCHANTS_FILE, "utf8")) : {};

for (const key of MERCHANT_KEYS) {
  if (ids[key]) {
    console.log(`keep   ${key} ${ids[key]}`);
    continue;
  }
  const m = await nessie.createMerchant(MERCHANT_SEEDS[key]);
  ids[key] = m._id;
  console.log(`create ${key} ${m._id}`);
}

writeFileSync(MERCHANTS_FILE, JSON.stringify(ids, null, 2) + "\n");
console.log(`wrote ${MERCHANTS_FILE.pathname}`);
