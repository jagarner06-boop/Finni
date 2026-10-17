import { afterEach, describe, expect, it, vi } from "vitest";
import { daysUntil, isoDay, nextMonthDay } from "../dates.js";

afterEach(() => vi.useRealTimers());

describe("isoDay (America/New_York)", () => {
  it("is still today at 9:30pm Eastern, when UTC has already rolled over", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-18T01:30:00Z")); // Sat Oct 17, 9:30pm EDT
    expect(isoDay()).toBe("2026-10-17");
    expect(isoDay(2)).toBe("2026-10-19");
    expect(isoDay(-1)).toBe("2026-10-16");
    expect(daysUntil("2026-10-19")).toBe(2);
  });

  it("rolls over at local midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-18T04:05:00Z")); // Sun Oct 18, 12:05am EDT
    expect(isoDay()).toBe("2026-10-18");
  });

  it("finds the next day-of-month from the local date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T02:00:00Z")); // Oct 31, 10pm EDT: the 1st is tomorrow, not today
    expect(nextMonthDay(1)).toBe("2026-11-01");
    expect(nextMonthDay(31)).toBe("2026-10-31");
  });
});
