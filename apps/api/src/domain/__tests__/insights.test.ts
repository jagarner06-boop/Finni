import type { Transaction } from "@finni/shared";
import { describe, expect, it } from "vitest";
import { findConvertedTrials, findDuplicateCharges, findSpendingSpikes } from "../insights.js";

let n = 0;
const tx = (merchantName: string, amountCents: number, date: string, category?: string, accountId = "card"): Transaction => ({
  id: `p${++n}`,
  accountId,
  merchantName,
  category,
  amountCents,
  date,
});

describe("findDuplicateCharges", () => {
  const p = [tx("Spotify", 1500, "2026-10-14", "Subscriptions"), tx("Spotify", 1500, "2026-10-14", "Subscriptions"), tx("Spotify", 1500, "2026-09-14", "Subscriptions")];
  it("finds the same merchant and amount on the same day", () => {
    const d = findDuplicateCharges(p);
    expect(d).toHaveLength(1);
    expect(d[0].duplicate.id).toBe(p[1].id);
    expect(d[0].original.id).toBe(p[0].id);
  });
  it("ignores charges outside the window", () => expect(findDuplicateCharges([tx("A", 500, "2026-10-01"), tx("A", 500, "2026-10-05")])).toHaveLength(0));
  it("ignores habits: the same coffee two days running", () => expect(findDuplicateCharges([tx("Starbucks", 600, "2026-10-04"), tx("Starbucks", 600, "2026-10-06")])).toHaveLength(0));
  it("ignores the next day's order", () => expect(findDuplicateCharges([tx("DoorDash", 2500, "2026-10-15"), tx("DoorDash", 2500, "2026-10-16")])).toHaveLength(0));
  it("ignores different amounts", () => expect(findDuplicateCharges([tx("A", 500, "2026-10-01"), tx("A", 600, "2026-10-01")])).toHaveLength(0));
  it("ignores different accounts", () => expect(findDuplicateCharges([tx("A", 500, "2026-10-01", undefined, "x"), tx("A", 500, "2026-10-01", undefined, "y")])).toHaveLength(0));
  it("pairs each purchase once", () => expect(findDuplicateCharges([tx("A", 500, "2026-10-01"), tx("A", 500, "2026-10-01"), tx("A", 500, "2026-10-01")])).toHaveLength(1));
});

describe("findConvertedTrials", () => {
  it("finds a first and only subscription charge in the last 14 days", () =>
    expect(findConvertedTrials([tx("Hulu", 1800, "2026-10-12", "Subscriptions")], "2026-10-17")).toHaveLength(1));
  it("ignores subscriptions with history", () =>
    expect(findConvertedTrials([tx("Spotify", 1500, "2026-10-14", "Subscriptions"), tx("Spotify", 1500, "2026-09-14", "Subscriptions")], "2026-10-17")).toHaveLength(0));
  it("ignores old charges", () => expect(findConvertedTrials([tx("Hulu", 1800, "2026-09-01", "Subscriptions")], "2026-10-17")).toHaveLength(0));
  it("ignores non-subscriptions", () => expect(findConvertedTrials([tx("AMC", 1600, "2026-10-12", "Entertainment")], "2026-10-17")).toHaveLength(0));
});

describe("findSpendingSpikes", () => {
  const before = ["2026-10-08", "2026-10-01", "2026-09-24", "2026-09-17"].map((d) => tx("DoorDash", 2200, d, "Food delivery"));
  const week = ["2026-10-16", "2026-10-15", "2026-10-13", "2026-10-11"].map((d) => tx("DoorDash", 2500, d, "Food delivery"));
  it("flags a category well above its weekly average", () =>
    expect(findSpendingSpikes([...before, ...week], "2026-10-17")[0]).toMatchObject({ category: "Food delivery", weekCents: 10_000, avgWeekCents: 2_200 }));
  it("ignores subscriptions (duplicate and trial nudges cover them)", () =>
    expect(findSpendingSpikes([tx("Hulu", 1800, "2026-10-16", "Subscriptions"), tx("Spotify", 3000, "2026-10-14", "Subscriptions")], "2026-10-17")).toHaveLength(0));
  it("ignores normal weeks", () => expect(findSpendingSpikes([...before, week[0]], "2026-10-17")).toHaveLength(0));
  it("ignores small totals", () =>
    expect(findSpendingSpikes([tx("Wawa", 500, "2026-10-01", "Gas"), tx("Wawa", 1500, "2026-10-16", "Gas")], "2026-10-17")).toHaveLength(0));
});
