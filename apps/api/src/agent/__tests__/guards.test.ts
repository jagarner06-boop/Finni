import { describe, expect, it } from "vitest";
import { findProblem, honestText, type Turn } from "../guards.js";

const turn = (t: Partial<Turn> = {}): Turn => ({ canPropose: false, proposed: false, toolNames: ["get_goals", "propose_bill_payment"], ...t });

describe("findProblem", () => {
  it("passes a normal answer", () => expect(findProblem("You have $2,140.", "You have $2,140.", turn())).toBeNull());
  it("catches a tool name written instead of called", () => expect(findProblem("Here you go [get_goals]", "Here you go", turn())).toMatch(/tool name/));
  it("catches 'I've paid'", () => expect(findProblem("I've paid your bill.", "I've paid your bill.", turn({ proposed: true }))).toMatch(/can't move money/));
  it("catches 'Tap Review' with nothing proposed", () =>
    expect(findProblem("I've set it up. Tap Review.", "I've set it up. Tap Review.", turn({ canPropose: true }))).toMatch(/didn't call a propose tool/));
  it("allows 'Tap Review' when a request exists", () =>
    expect(findProblem("Tap Review to approve it.", "Tap Review to approve it.", turn({ canPropose: true, proposed: true }))).toBeNull());
});

describe("honestText", () => {
  it("keeps a true answer", () => expect(honestText("Your phone bill is due Oct 19.", turn())).toBe("Your phone bill is due Oct 19."));
  it("replaces a false claim, pointing at the real request", () => expect(honestText("I've paid it.", turn({ proposed: true }))).toMatch(/Tap Review/));
  it("replaces a false claim with an offer when nothing was set up", () => expect(honestText("Done! Paid.", turn())).toMatch(/can set it up/));
});
