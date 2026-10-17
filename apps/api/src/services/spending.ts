import type { SpendingItem } from "@finni/shared";
import type { User } from "../db/schema.js";
import { listPurchases } from "./transactions.js";

export interface SpendingSummary {
  days: number;
  groupBy: "category" | "merchant";
  totalCents: number;
  items: SpendingItem[];
}

/** Purchase totals over the last `days`, grouped by category or merchant, biggest first. */
export async function spendingSummary(user: User, days: number, groupBy: "category" | "merchant"): Promise<SpendingSummary> {
  const txs = await listPurchases(user, { days });
  const totals = new Map<string, number>();
  for (const t of txs) {
    const label = groupBy === "merchant" ? t.merchantName : (t.category ?? "Other");
    totals.set(label, (totals.get(label) ?? 0) + t.amountCents);
  }
  const totalCents = txs.reduce((s, t) => s + t.amountCents, 0);
  const items = [...totals]
    .map(([label, amountCents]) => ({ label, amountCents, percent: totalCents ? Math.round((amountCents / totalCents) * 100) : 0 }))
    .sort((a, b) => b.amountCents - a.amountCents);
  return { days, groupBy, totalCents, items };
}
