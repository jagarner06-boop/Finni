import { toCents, type LedgerEntry } from "@finni/shared";
import type { User } from "../db/schema.js";
import { isoDay } from "../lib/dates.js";
import { nessie } from "../nessie/client.js";
import { ownedAccount } from "./ownership.js";
import { listPurchases } from "./transactions.js";

// Activity → Transactions: every money movement on the user's accounts, newest first.

/** Card refunds are deposits described `Refund · <merchant> · <purchaseId>` (see dispute_charge). */
export const REFUND_PREFIX = "Refund · ";
export const refundDescription = (merchant: string, purchaseId: string) => `${REFUND_PREFIX}${merchant} · ${purchaseId}`;

/** "Transfer to Hawaii Fund · <action id>" → "Transfer to Hawaii Fund". */
const titleOf = (description: string | undefined, fallback: string) => description?.split(" · ").slice(0, description.startsWith(REFUND_PREFIX) ? 2 : 1).join(" · ").trim() || fallback;

export async function listLedger(user: User, opts: { days?: number; accountId?: string } = {}): Promise<LedgerEntry[]> {
  if (opts.accountId) await ownedAccount(user, opts.accountId);
  const all = await nessie.getCustomerAccounts(user.nessieCustomerId);
  const accounts = opts.accountId ? all.filter((a) => a._id === opts.accountId) : all;
  const label = new Map(all.map((a) => [a._id, a.nickname]));
  const since = isoDay(1 - (opts.days ?? 30));

  const [purchases, movements] = await Promise.all([
    listPurchases(user, { days: opts.days ?? 30, accountId: opts.accountId }),
    Promise.all(
      accounts.map(async (a) => {
        const [deposits, withdrawals] = await Promise.all([nessie.getDeposits(a._id), nessie.getWithdrawals(a._id)]);
        const live = <T extends { status: string; transaction_date: string }>(xs: T[]) => xs.filter((x) => x.status !== "cancelled" && x.transaction_date >= since);
        return [
          ...live(deposits).map((d): LedgerEntry => ({ id: d._id, accountId: a._id, accountLabel: a.nickname, kind: "deposit", title: titleOf(d.description, "Deposit"), amountCents: toCents(d.amount), date: d.transaction_date })),
          ...live(withdrawals).map((w): LedgerEntry => ({ id: w._id, accountId: a._id, accountLabel: a.nickname, kind: "withdrawal", title: titleOf(w.description, "Withdrawal"), amountCents: -toCents(w.amount), date: w.transaction_date })),
        ];
      }),
    ),
  ]);

  const entries: LedgerEntry[] = [
    ...purchases.map((p): LedgerEntry => ({ id: p.id, accountId: p.accountId, accountLabel: label.get(p.accountId) ?? "", kind: "purchase", title: p.merchantName, category: p.category, amountCents: -p.amountCents, date: p.date })),
    ...movements.flat(),
  ];
  return entries.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

/** Purchase ids already refunded on the card, so a duplicate is never refunded twice. */
export async function refundedPurchaseIds(user: User): Promise<Set<string>> {
  if (!user.creditAccountId) return new Set();
  const deposits = await nessie.getDeposits(user.creditAccountId);
  return new Set(deposits.filter((d) => d.status !== "cancelled" && d.description?.startsWith(REFUND_PREFIX)).map((d) => d.description!.split(" · ").at(-1)!.trim()));
}
