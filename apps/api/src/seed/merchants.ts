import { readFileSync } from "node:fs";
import type { NessieMerchant } from "../nessie/types.js";

// Our own Nessie merchants, so names and categories are reliable. Created once per Nessie key by
// `npm run seed:merchants`, which writes their IDs to merchants.generated.json.

export const MERCHANT_KEYS = ["publix", "starbucks", "doordash", "chipotle", "wawa", "spotify", "netflix", "amc", "ufBookstore", "target", "uber"] as const;
export type MerchantKey = (typeof MERCHANT_KEYS)[number];

const gnv = (street_number: string, street_name: string, lat: number, lng: number) => ({
  address: { street_number, street_name, city: "Gainesville", state: "FL", zip: "32601" },
  geocode: { lat, lng },
});

export const MERCHANT_SEEDS: Record<MerchantKey, Omit<NessieMerchant, "_id">> = {
  publix: { name: "Publix", category: "Groceries", ...gnv("1250", "W University Ave", 29.6521, -82.3381) },
  starbucks: { name: "Starbucks", category: "Coffee", ...gnv("1702", "W University Ave", 29.6518, -82.3433) },
  doordash: { name: "DoorDash", category: "Food delivery", ...gnv("1", "Online", 29.6516, -82.3248) },
  chipotle: { name: "Chipotle", category: "Dining", ...gnv("1604", "W University Ave", 29.6519, -82.3419) },
  wawa: { name: "Wawa", category: "Gas", ...gnv("1430", "SW 13th St", 29.6375, -82.3381) },
  spotify: { name: "Spotify", category: "Subscriptions", ...gnv("1", "Online", 29.6516, -82.3248) },
  netflix: { name: "Netflix", category: "Subscriptions", ...gnv("1", "Online", 29.6516, -82.3248) },
  amc: { name: "AMC", category: "Entertainment", ...gnv("3101", "SW 35th Blvd", 29.6227, -82.3746) },
  ufBookstore: { name: "UF Bookstore", category: "School", ...gnv("1", "Museum Rd", 29.6465, -82.3479) },
  target: { name: "Target", category: "Shopping", ...gnv("3970", "SW Archer Rd", 29.6205, -82.3803) },
  uber: { name: "Uber", category: "Transport", ...gnv("1", "Online", 29.6516, -82.3248) },
};

export const MERCHANTS_FILE = new URL("./merchants.generated.json", import.meta.url);

let cached: Record<MerchantKey, string> | null = null;

/** Nessie merchant IDs by key. Throws with a fix-it hint when the seed script hasn't been run. */
export function merchantIds(): Record<MerchantKey, string> {
  if (cached) return cached;
  try {
    cached = JSON.parse(readFileSync(MERCHANTS_FILE, "utf8")) as Record<MerchantKey, string>;
  } catch {
    throw new Error("Missing src/seed/merchants.generated.json. Run `npm run seed:merchants -w @finni/api` once.");
  }
  const missing = MERCHANT_KEYS.filter((k) => !cached![k]);
  if (missing.length) throw new Error(`merchants.generated.json is missing ${missing.join(", ")}. Re-run seed:merchants.`);
  return cached;
}
