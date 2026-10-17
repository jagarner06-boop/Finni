import { describe, expect, it } from "vitest";
import { nextStatementClose, planCardPayment, utilizationPct } from "../card.js";

describe("planCardPayment", () => {
  const base = { balanceCents: 136_400, limitCents: 200_000 };
  it("pays down to 9% of the limit", () => expect(planCardPayment({ ...base, availableCents: 214_000 })).toBe(118_400));
  it("keeps $100 in checking", () => expect(planCardPayment({ ...base, availableCents: 60_000 })).toBe(50_000));
  it("is 0 when checking can't spare anything", () => expect(planCardPayment({ ...base, availableCents: 9_000 })).toBe(0));
  it("is 0 when already under 9%", () => expect(planCardPayment({ balanceCents: 10_000, limitCents: 200_000, availableCents: 214_000 })).toBe(0));
  it("is whole dollars", () => expect(planCardPayment({ balanceCents: 136_450, limitCents: 200_000, availableCents: 214_000 }) % 100).toBe(0));
});

describe("utilizationPct", () => {
  it("rounds the percent used", () => expect(utilizationPct(136_400, 200_000)).toBe(68));
  it("is 0 without a limit", () => expect(utilizationPct(5_000, 0)).toBe(0));
});

describe("nextStatementClose", () => {
  it("is this month when the day is still ahead", () => expect(nextStatementClose(23, "2026-10-17")).toBe("2026-10-23"));
  it("is next month when the day has passed", () => expect(nextStatementClose(5, "2026-10-17")).toBe("2026-11-05"));
  it("is today on the day", () => expect(nextStatementClose(17, "2026-10-17")).toBe("2026-10-17"));
});
