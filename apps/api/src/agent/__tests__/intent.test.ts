import { describe, expect, it } from "vitest";
import { wantsAction } from "../intent.js";

const OFFER = "You've got your Electric bill for $82 due Oct 29. Want me to set that up?";
const NO_OFFER = "You've spent $264 this week, mostly on food delivery.";

describe("wantsAction", () => {
  it.each([
    "Pay my phone bill",
    "pay it for me",
    "Move $50 to savings",
    "Put $60 toward spring break",
    "Max out my car repair goal",
    "Cancel hulu",
    "Dispute Spotify",
    "Make a goal for a laptop, $900 by May",
    "Can you pay my electric bill?",
    "could you transfer $20 to Rainy Day please",
    "Pay my card down",
    "Get my Spotify money back",
  ])("asks for an action: %s", (m) => expect(wantsAction(m, null)).toBe(true));

  it.each([
    "What's best for my finances next?",
    "What should I pay next",
    "How much did I pay for rent?",
    "What did I spend on food this week?",
    "How are my goals doing?",
    "Thanks finn",
    "Help me review this alert: Food delivery is up this week",
    "Check alerts",
    "What is my total networth",
    "Show me a chart",
  ])("doesn't ask for an action: %s", (m) => expect(wantsAction(m, null)).toBe(false));

  it("accepts a yes to Finn's offer", () => {
    expect(wantsAction("yes", OFFER)).toBe(true);
    expect(wantsAction("Sure!", OFFER)).toBe(true);
    expect(wantsAction("go ahead", OFFER)).toBe(true);
  });

  it("ignores a yes when Finn didn't offer anything", () => {
    expect(wantsAction("yes", NO_OFFER)).toBe(false);
    expect(wantsAction("ok", null)).toBe(false);
  });
});
