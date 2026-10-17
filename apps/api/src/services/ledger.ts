import { toCents } from "@finni/shared";
import { nessie } from "../nessie/client.js";
import type { NessieAccount } from "../nessie/types.js";

// This Nessie build never changes `account.balance` after creation and its transfers carry no payee.
// So every money movement is recorded in Nessie as purchases / withdrawals / deposits, and the live
// balance is derived from those records: opening + deposits − withdrawals − purchases.
// Nessie also truncates every amount to whole dollars, so all movements must be whole dollars.

const counts = (status: string) => status !== "cancelled";

export async function liveBalanceCents(account: NessieAccount): Promise<number> {
  const [deposits, withdrawals, purchases] = await Promise.all([
    nessie.getDeposits(account._id),
    nessie.getWithdrawals(account._id),
    nessie.getPurchases(account._id),
  ]);
  const sum = (xs: { amount: number; status: string }[]) => xs.filter((x) => counts(x.status)).reduce((s, x) => s + toCents(x.amount), 0);
  return toCents(account.balance) + sum(deposits) - sum(withdrawals) - sum(purchases);
}

/** Moves money between two of the user's accounts: withdrawal on `from` + deposit on `to`, linked by `ref`. */
export async function moveMoney(opts: { fromAccountId: string; toAccountId: string; amountCents: number; fromLabel: string; toLabel: string; ref: string }) {
  if (opts.amountCents <= 0 || opts.amountCents % 100 !== 0) throw new Error("Amounts must be positive whole dollars (Nessie drops cents)");
  const amount = opts.amountCents / 100;
  const withdrawal = await nessie.createWithdrawal(opts.fromAccountId, { amount, description: `Transfer to ${opts.toLabel} · ${opts.ref}` });
  const deposit = await nessie.createDeposit(opts.toAccountId, { amount, description: `Transfer from ${opts.fromLabel} · ${opts.ref}` });
  return { withdrawalId: withdrawal._id, depositId: deposit._id };
}
