import type { AccountType } from "@finni/shared";

/**
 * Live balance from Nessie's records (its `account.balance` never changes after creation).
 * Debit accounts hold money; a credit card's balance is what's owed, so the signs flip.
 */
export function ledgerBalanceCents(type: AccountType, openingCents: number, depositsCents: number, withdrawalsCents: number, purchasesCents: number): number {
  return type === "Credit Card"
    ? openingCents + purchasesCents + withdrawalsCents - depositsCents
    : openingCents + depositsCents - withdrawalsCents - purchasesCents;
}
