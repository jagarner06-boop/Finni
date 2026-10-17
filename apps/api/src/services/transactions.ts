import { toCents, type Transaction } from "@finni/shared";
import type { User } from "../db/schema.js";
import { isoDay } from "../lib/dates.js";
import { nessie } from "../nessie/client.js";
import type { NessieMerchant } from "../nessie/types.js";

const UNKNOWN_MERCHANT = { name: "Unknown merchant", category: undefined };

async function merchantsById(ids: string[]): Promise<Map<string, { name: string; category?: string }>> {
  const unique = [...new Set(ids)];
  const found = await Promise.all(unique.map((id) => nessie.getMerchant(id).catch((): NessieMerchant | null => null)));
  return new Map(unique.map((id, i) => [id, found[i] ? { name: found[i].name, category: found[i].category || undefined } : UNKNOWN_MERCHANT]));
}

/** The user's card purchases (newest first) with merchant names joined in. */
export async function listPurchases(
  user: User,
  opts: { days?: number; merchantQuery?: string; accountId?: string; limit?: number } = {},
): Promise<Transaction[]> {
  const accountIds = opts.accountId ? [opts.accountId] : (await nessie.getCustomerAccounts(user.nessieCustomerId)).map((a) => a._id);
  // "Last N days" = N calendar days including today.
  const since = isoDay(1 - (opts.days ?? 30));
  const raw = (await Promise.all(accountIds.map(async (accountId) => (await nessie.getPurchases(accountId)).map((p) => ({ ...p, accountId })))))
    .flat()
    .filter((p) => p.status !== "cancelled" && p.purchase_date >= since);
  const merchants = await merchantsById(raw.map((p) => p.merchant_id));

  const q = opts.merchantQuery?.trim().toLowerCase();
  const txs = raw
    .map((p): Transaction => {
      const m = merchants.get(p.merchant_id) ?? UNKNOWN_MERCHANT;
      return { id: p._id, accountId: p.accountId, merchantName: m.name, category: m.category, amountCents: toCents(p.amount), date: p.purchase_date, description: p.description || undefined };
    })
    .filter((t) => !q || t.merchantName.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date));
  return opts.limit ? txs.slice(0, opts.limit) : txs;
}
