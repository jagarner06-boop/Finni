import { describe, expect, it } from "vitest";
import { ledgerBalanceCents } from "../ledger.js";

describe("ledgerBalanceCents", () => {
  it("debit accounts: opening + deposits − withdrawals − purchases", () => {
    expect(ledgerBalanceCents("Checking", 100_000, 5_000, 2_000, 1_500)).toBe(101_500);
    expect(ledgerBalanceCents("Savings", 0, 5_000, 0, 0)).toBe(5_000);
  });
  it("credit cards: amount owed = opening + purchases + withdrawals − deposits", () => {
    expect(ledgerBalanceCents("Credit Card", 100_000, 10_000, 0, 1_500)).toBe(91_500);
  });
});
