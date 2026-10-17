import { describe, expect, it } from "vitest";
import { reference, resultLineFor } from "../actionCopy.js";

describe("reference", () => {
  it("has a type prefix and five digits", () => expect(reference("card_payment", "abc")).toMatch(/^#CP-\d{5}$/));
  it("is stable", () => expect(reference("transfer", "abc")).toBe(reference("transfer", "abc")));
  it("covers every type", () =>
    expect(["transfer", "bill_payment", "create_goal", "dispute_charge", "cancel_subscription"].map((t) => reference(t as never, "x").slice(0, 4))).toEqual(["#TR-", "#BP-", "#GL-", "#DC-", "#CS-"]));
});

describe("resultLineFor", () => {
  it("card payment", () =>
    expect(resultLineFor({ type: "card_payment", amountCents: 118_400, to: "Closer Card" })).toBe("Paid $1,184.00 to Closer Card. Utilization will update when the statement closes."));
  it("transfer", () =>
    expect(resultLineFor({ type: "transfer", amountCents: 20_000, to: "Hawaii Fund", from: "Everyday", fromBalanceCents: 194_000 })).toBe("$200.00 is in Hawaii Fund. Everyday has $1,940.00 left."));
  it("bill payment", () => expect(resultLineFor({ type: "bill_payment", amountCents: 4_500, payee: "Visible" })).toBe("Paid $45.00 to Visible."));
  it("dispute", () => expect(resultLineFor({ type: "dispute_charge", amountCents: 1_500, merchant: "Spotify", card: "Closer Card" })).toBe("$15.00 from Spotify is back on your Closer Card."));
  it("cancel", () => expect(resultLineFor({ type: "cancel_subscription", payee: "Hulu" })).toBe("Hulu is cancelled. No more charges."));
  it("goal with a plan", () =>
    expect(resultLineFor({ type: "create_goal", goal: "Hawaii Fund", contributionCents: 5_000, firstDate: "2026-10-17" })).toBe("Hawaii Fund is open. The first $50.00 is ready Oct 17."));
  it("goal without a plan", () => expect(resultLineFor({ type: "create_goal", goal: "Laptop" })).toBe("Laptop is open."));
});
