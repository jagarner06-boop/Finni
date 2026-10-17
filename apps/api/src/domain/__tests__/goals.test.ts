import { describe, expect, it } from "vitest";
import { advanceContribution, cadenceLabel, goalEta, isBehind } from "../goals.js";

describe("advanceContribution", () => {
  it("adds a week", () => expect(advanceContribution("2026-10-17", "weekly")).toBe("2026-10-24"));
  it("adds two weeks", () => expect(advanceContribution("2026-10-17", "biweekly")).toBe("2026-10-31"));
  it("adds a month, clamped to the month's end", () => expect(advanceContribution("2026-01-31", "monthly")).toBe("2026-02-28"));
});

describe("goalEta", () => {
  it("counts the contributions still needed", () =>
    expect(goalEta({ currentCents: 148_800, targetCents: 240_000, contributionCents: 5_000, cadence: "weekly" }, "2026-10-17")).toBe("2027-02-27"));
  it("is today when funded", () => expect(goalEta({ currentCents: 100_000, targetCents: 100_000, contributionCents: null, cadence: null }, "2026-10-17")).toBe("2026-10-17"));
  it("works out huge plans without looping", () => {
    const started = Date.now();
    expect(goalEta({ currentCents: 0, targetCents: 2_000_000_000, contributionCents: 100, cadence: "weekly" }, "2026-10-17")).toBeNull();
    expect(goalEta({ currentCents: 0, targetCents: 120_000, contributionCents: 10_000, cadence: "monthly" }, "2026-01-31")).toBe("2027-01-31");
    expect(Date.now() - started).toBeLessThan(50);
  });
  it("is null without a plan", () => expect(goalEta({ currentCents: 0, targetCents: 100_000, contributionCents: null, cadence: null }, "2026-10-17")).toBeNull());
});

describe("isBehind", () => {
  it("is behind when the eta is after the target date", () => expect(isBehind("2027-03-01", "2026-12-01")).toBe(true));
  it("is not behind without an eta", () => expect(isBehind(null, "2026-12-01")).toBe(false));
  it("is not behind without a target date", () => expect(isBehind("2027-03-01", null)).toBe(false));
});

it("labels cadences", () => expect(["weekly", "biweekly", "monthly"].map((c) => cadenceLabel(c as never))).toEqual(["weekly", "every 2 weeks", "monthly"]));
