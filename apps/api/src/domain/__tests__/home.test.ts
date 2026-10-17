import type { Account, CardSummary, Goal, Nudge } from "@finni/shared";
import { describe, expect, it } from "vitest";
import { buildHome, type HomeInput } from "../home.js";

const card: CardSummary = { accountId: "card", nickname: "Closer Card", mask: "4821", balanceCents: 136_400, limitCents: 200_000, utilization: 68, statementCloseDate: "2026-10-23", closesInDays: 6 };
const checking: Account = { id: "chk", nickname: "Everyday", type: "Checking", balanceCents: 214_000, mask: "1093", isGoal: false };
const nudge = (rule: Nudge["rule"], severity: Nudge["severity"], over: Partial<Nudge> = {}): Nudge => ({
  id: rule, rule, title: rule, body: rule, mood: "worried", severity, face: null, meta: "", highlight: null,
  action: { type: "propose_bill_payment", billId: "b", label: "Go" }, notifiedAt: null, readAt: null, dismissedAt: null, resolvedAt: null, createdAt: "2026-10-17T00:00:00Z", ...over,
});
const goal = (name: string, currentCents: number, status: Goal["status"] = "active"): Goal => ({
  id: name, name, icon: null, targetCents: 100_000, currentCents, percent: 0, targetDate: null, nessieAccountId: name, milestonesHit: [], status,
  createdAt: "2026-09-01T00:00:00Z", cadence: null, contributionCents: null, nextContributionOn: null, eta: null, behind: false,
});
const h: HomeInput = {
  firstName: "Gabe",
  card,
  checking,
  nudges: [nudge("duplicate_charge", "danger"), nudge("high_utilization", "danger"), nudge("trial_converted", "warning"), nudge("goal_milestone", "info", { action: null })],
  goals: [goal("Hawaii Fund", 148_800), goal("Car repair", 42_000), goal("Emergency", 100_000, "completed"), goal("Old", 5_000, "archived")],
  prefs: { notifications: true, hideBalance: false },
};

describe("buildHome", () => {
  it("passes the card through, or null", () => {
    expect(buildHome(h).card).toBe(card);
    expect(buildHome({ ...h, card: null }).card).toBeNull();
  });
  it("prefers the utilization plan", () => expect(buildHome(h).plan!.rule).toBe("high_utilization"));
  it("falls back to the first actionable nudge", () => expect(buildHome({ ...h, nudges: h.nudges.filter((n) => n.rule !== "high_utilization") }).plan!.rule).toBe("duplicate_charge"));
  it("has no plan without nudges", () => expect(buildHome({ ...h, card: null, nudges: [] }).plan).toBeNull());
  it("shows the top two warnings, minus the plan", () => {
    expect(buildHome(h).attention.map((n) => n.rule)).toEqual(["duplicate_charge", "trial_converted"]);
    expect(buildHome(h).attentionCount).toBe(2);
  });
  it("leaves out resolved and dismissed nudges", () => {
    expect(buildHome({ ...h, nudges: h.nudges.map((n) => ({ ...n, resolvedAt: "2026-10-17T00:00:00Z" })) }).attention).toEqual([]);
    expect(buildHome({ ...h, nudges: h.nudges.map((n) => ({ ...n, dismissedAt: "2026-10-17T00:00:00Z" })) }).plan).toBeNull();
  });
  it("sums goals that aren't archived", () => expect(buildHome(h).goals).toEqual({ count: 3, savedCents: 290_800 }));
  it("honors hide balance", () => expect(buildHome({ ...h, prefs: { notifications: true, hideBalance: true } }).hideBalance).toBe(true));
});
