import type { Account, Bill, Goal, FinnProfile } from "@finni/shared";
import { describe, expect, it } from "vitest";
import { detectPaycheck, forecastCashflow, type CashflowInput } from "../cashflow.js";
const checking: Account = { id: "chk", nickname: "Everyday", type: "Checking", balanceCents: 214_000, mask: "1093", isGoal: false };
const bill = (over: Partial<Bill>): Bill => ({ id: "b", accountId: "chk", payee: "Visible", nickname: "Phone", amountCents: 4_500, dueDate: "2026-10-19", status: "pending", ...over });
const goal = (over: Partial<Goal>): Goal => ({
  id: "g1", name: "Car repair", icon: "tool", targetCents: 150_000, currentCents: 42_000, percent: 28, targetDate: "2026-12-01", nessieAccountId: "acc_g1",
  milestonesHit: [], status: "active", createdAt: "2026-09-01T00:00:00Z", cadence: "biweekly", contributionCents: 4_000, nextContributionOn: "2026-10-17", eta: null, behind: true, ...over,
});
const today = "2026-10-17";
const job = ["2026-10-15", "2026-10-01", "2026-09-17", "2026-09-03", "2026-08-20"].map((date) => ({ date, amountCents: 62_000, description: "Campus job" }));
const mom = ["2026-10-12", "2026-09-12"].map((date) => ({ date, amountCents: 25_000, description: "From Mom" }));
const bills = [
  bill({}), // Phone, pending, 4_500, due 2026-10-19, on chk
  bill({ id: "elec", payee: "GRU", nickname: "Electric", amountCents: 8_200, dueDate: "2026-10-29" }),
  bill({ id: "rent", payee: "Gainesville Place", nickname: "Rent", amountCents: 75_000, status: "recurring", dueDate: null, recurringDate: 1 }),
  bill({ id: "hulu", accountId: "card", payee: "Hulu", nickname: "Hulu", amountCents: 1_800, status: "recurring", dueDate: null, recurringDate: 20 }),
];
const goals = [
  goal({ id: "hawaii", name: "Hawaii Fund", cadence: "weekly", contributionCents: 5_000, nextContributionOn: "2026-10-20" }),
  goal({ id: "car", name: "Car repair", cadence: "biweekly", contributionCents: 4_000, nextContributionOn: "2026-10-17" }),
  goal({ id: "em", name: "Emergency", cadence: null, contributionCents: null, nextContributionOn: null }),
];
const input = (over: Partial<CashflowInput> = {}): CashflowInput => ({ today, checking, deposits: [...job, ...mom], bills, goals, profile: null, ...over });
const profile = (over: Partial<FinnProfile>): FinnProfile => ({ lifeStage: "student", paySchedule: "biweekly", nextPayday: "2026-11-03", style: "steady", handsOn: "suggest", ...over });

describe("detectPaycheck", () => {
  it("finds the regular paycheck and skips occasional deposits", () =>
    expect(detectPaycheck([...job, ...mom], today)).toEqual({ date: "2026-10-29", amountCents: 62_000, source: "Campus job", basis: "deposits" }));
  it("needs three regular deposits", () => expect(detectPaycheck(job.slice(0, 2), today)).toBeNull());
  it("ignores irregular gaps", () =>
    expect(detectPaycheck(["2026-10-15", "2026-10-10", "2026-09-20", "2026-09-11"].map((date) => ({ date, amountCents: 30_000, description: "Gig" })), today)).toBeNull());
  it("ignores one-off transfers", () =>
    expect(detectPaycheck([1, 2, 3].map((n) => ({ date: `2026-10-0${n}`, amountCents: 5_000, description: `Transfer from Rainy Day · a${n}` })), today)).toBeNull());
});

describe("forecastCashflow", () => {
  it("counts bills and goal savings before the next paycheck", () => {
    const f = forecastCashflow(input())!;
    expect(f.untilDate).toBe("2026-10-28");
    expect(f.commitments.map((c) => `${c.label} ${c.date}`)).toEqual(["Car repair 2026-10-17", "Phone 2026-10-19", "Hawaii Fund 2026-10-20", "Hawaii Fund 2026-10-27"]);
    expect(f).toMatchObject({ balanceCents: 214_000, billsCents: 4_500, goalsCents: 14_000, safeCents: 195_500, shortCents: 0, firstShort: null });
  });
  it("counts an unpaid overdue bill as due today", () =>
    expect(forecastCashflow(input({ bills: [bill({ dueDate: "2026-10-10" })], goals: [] }))!.commitments).toEqual([{ kind: "bill", id: "b", label: "Phone", date: today, amountCents: 4_500 }]));
  it("finds the bill that overdraws Checking", () => {
    const f = forecastCashflow(input({ checking: { ...checking, balanceCents: 10_000 }, bills: [bill({}), bill({ id: "ins", payee: "Geico", nickname: "Car insurance", amountCents: 9_000, dueDate: "2026-10-24" })] }))!;
    expect(f).toMatchObject({ shortCents: 3_500, safeCents: -17_500, firstShort: { kind: "bill", id: "ins", label: "Car insurance", date: "2026-10-24", amountCents: 9_000 } });
  });
  it("falls back to the payday the user gave", () => {
    const f = forecastCashflow(input({ deposits: [], profile: profile({}) }))!;
    expect(f.paycheck).toEqual({ date: "2026-11-03", amountCents: null, source: "Your payday", basis: "profile" });
    expect(f.untilDate).toBe("2026-11-02");
    expect(f.commitments).toContainEqual({ kind: "bill", id: "rent", label: "Rent", date: "2026-11-01", amountCents: 75_000 });
  });
  it.each([
    ["biweekly", "2026-10-02", "2026-10-30"],
    ["semi", "2026-10-15", "2026-11-01"],
    ["monthly", "2026-09-30", "2026-10-30"],
  ] as const)("rolls a past %s payday forward", (paySchedule, nextPayday, expected) =>
    expect(forecastCashflow(input({ deposits: [], profile: profile({ paySchedule, nextPayday }) }))!.paycheck!.date).toBe(expected));
  it("drops a past payday when pay is irregular", () =>
    expect(forecastCashflow(input({ deposits: [], profile: profile({ paySchedule: "irregular", nextPayday: "2026-10-02" }) }))!.paycheck).toBeNull());
  it("looks two weeks ahead without a paycheck", () => {
    const f = forecastCashflow(input({ deposits: [] }))!;
    expect(f.paycheck).toBeNull();
    expect(f.untilDate).toBe("2026-10-30");
  });
  it("clamps a day-31 bill to the month's end", () =>
    expect(forecastCashflow(input({ today: "2026-11-20", deposits: [], goals: [], bills: [bill({ id: "s", nickname: "Storage", status: "recurring", dueDate: null, recurringDate: 31 })] }))!.commitments.map((c) => c.date)).toEqual(["2026-11-30"]));
  it("needs Checking", () => expect(forecastCashflow(input({ checking: null }))).toBeNull());
});
