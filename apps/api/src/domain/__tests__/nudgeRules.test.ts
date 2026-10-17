import type { Account, Bill, CardSummary, Goal, Transaction } from "@finni/shared";
import { describe, expect, it } from "vitest";
import { buildNudges, type NudgeInput } from "../nudgeRules.js";

const card: CardSummary = { accountId: "card", nickname: "Closer Card", mask: "4821", balanceCents: 136_400, limitCents: 200_000, utilization: 68, statementCloseDate: "2026-10-23", closesInDays: 6 };
const checking: Account = { id: "chk", nickname: "Everyday", type: "Checking", balanceCents: 214_000, mask: "1093", isGoal: false };
const bill = (over: Partial<Bill>): Bill => ({ id: "b", accountId: "chk", payee: "Visible", nickname: "Phone", amountCents: 4_500, dueDate: "2026-10-19", status: "pending", ...over });
const tx = (id: string, merchantName: string, amountCents: number, date: string, category?: string): Transaction => ({ id, accountId: "card", merchantName, amountCents, date, category });
const goal = (over: Partial<Goal>): Goal => ({
  id: "g1", name: "Car repair", icon: "tool", targetCents: 150_000, currentCents: 42_000, percent: 28, targetDate: "2026-12-01", nessieAccountId: "acc_g1",
  milestonesHit: [], status: "active", createdAt: "2026-09-01T00:00:00Z", cadence: "biweekly", contributionCents: 4_000, nextContributionOn: "2026-10-17", eta: null, behind: true, ...over,
});
const dupId = "p_dup";
const base = (): NudgeInput => ({
  today: "2026-10-17",
  card,
  checking,
  bills: [bill({}), bill({ id: "hulu_bill", accountId: "card", payee: "Hulu", nickname: "Hulu", amountCents: 1_800, status: "recurring", dueDate: "2026-11-12" })],
  purchases: [
    tx("p1", "Spotify", 1_500, "2026-10-14", "Subscriptions"),
    tx(dupId, "Spotify", 1_500, "2026-10-14", "Subscriptions"),
    tx("p0", "Spotify", 1_500, "2026-09-14", "Subscriptions"),
    tx("p_hulu", "Hulu", 1_800, "2026-10-12", "Subscriptions"),
  ],
  refunded: new Set(),
  goals: [goal({})],
});

describe("buildNudges", () => {
  const n = buildNudges(base());
  const by = (rule: string) => n.find((x) => x.rule === rule)!;

  it("notices everything worth acting on", () =>
    expect(n.map((x) => x.rule)).toEqual(expect.arrayContaining(["high_utilization", "duplicate_charge", "trial_converted", "bill_due", "goal_contribution"])));
  it("puts danger first", () => expect(n[0].severity).toBe("danger"));
  it("offers the 9% plan before the statement closes", () => {
    expect(by("high_utilization").body).toBe("I can drop your utilization to 9% before Oct 23.");
    expect(by("high_utilization").highlight).toBe("9%");
    expect(by("high_utilization").action).toEqual({ type: "propose_card_payment", amountCents: 118_400, label: "Review plan" });
  });
  it("describes the duplicate in one meta line", () => {
    expect(by("duplicate_charge").meta).toBe("Spotify · $15.00 · Oct 14");
    expect(by("duplicate_charge").action).toEqual({ type: "propose_dispute", purchaseId: dupId, label: "Get it back" });
    expect(by("duplicate_charge").face).toBe("skeptical");
  });
  it("links the converted trial to its recurring bill", () => expect(by("trial_converted").action).toEqual({ type: "propose_cancel_subscription", billId: "hulu_bill", label: "Cancel Hulu" }));
  it("offers to pay a bill due soon", () => {
    expect(by("bill_due").title).toBe("Phone due in 2 days");
    expect(by("bill_due").action).toEqual({ type: "propose_bill_payment", billId: "b", label: "Review payment" });
  });
  it("asks for a due goal contribution", () => {
    expect(by("goal_contribution").body).toBe("Time to move $40.00 to Car repair. That keeps your every-2-weeks plan going.");
    expect(by("goal_contribution").action).toEqual({ type: "propose_goal_contribution", goalId: "g1", amountCents: 4_000, label: "Move $40.00" });
  });
  it("skips a duplicate that was refunded", () => expect(buildNudges({ ...base(), refunded: new Set([dupId]) }).some((x) => x.rule === "duplicate_charge")).toBe(false));
  it("skips the plan when checking can't cover it", () =>
    expect(buildNudges({ ...base(), checking: { ...checking, balanceCents: 5_000 } }).some((x) => x.rule === "high_utilization")).toBe(false));
  it("skips the plan without a card", () => expect(buildNudges({ ...base(), card: null }).some((x) => x.rule === "high_utilization")).toBe(false));
  it("warns when checking is low", () => expect(buildNudges({ ...base(), checking: { ...checking, balanceCents: 5_000 } }).some((x) => x.rule === "low_balance")).toBe(true));
  it("skips bills already paid or far off", () =>
    expect(buildNudges({ ...base(), bills: [bill({ status: "completed" }), bill({ id: "far", dueDate: "2026-10-30" })] }).some((x) => x.rule === "bill_due")).toBe(false));
  it("celebrates the highest milestone", () =>
    expect(buildNudges({ ...base(), goals: [goal({ milestonesHit: [25, 50], cadence: null })] }).find((x) => x.rule === "goal_milestone")!.title).toBe("Car repair hit 50%"));
  it("has unique dedupe keys", () => expect(new Set(n.map((x) => x.dedupeKey)).size).toBe(n.length));
  it("uses no emoji", () => {
    for (const x of n) expect(x.title + x.body + x.meta).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
