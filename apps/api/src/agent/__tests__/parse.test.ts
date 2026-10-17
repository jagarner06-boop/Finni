import type { Account, CardSummary } from "@finni/shared";
import { describe, expect, it } from "vitest";
import type { User } from "../../db/schema.js";
import { claimsCompletedAction, claimsProposal, DEFAULT_CHIPS, namesToolInsteadOfCalling, parseReply, plainText } from "../parse.js";
import { systemPrompt } from "../prompt.js";

describe("parseReply", () => {
  it("reads mood, text and chips", () =>
    expect(parseReply("[mood:worried] You owe $1,364.00. [chips: Pay it down | Why 9%?]")).toEqual({ mood: "worried", text: "You owe $1,364.00.", chips: ["Pay it down", "Why 9%?"] }));
  it("falls back to default chips", () => expect(parseReply("Hello").chips).toEqual(DEFAULT_CHIPS));
  it("keeps at most three chips", () => expect(parseReply("[mood:happy] Hi [chips: a | b | c | d]").chips).toHaveLength(3));
  it("trims long chips", () => expect(parseReply("[mood:happy] Hi [chips: " + "x".repeat(40) + "]").chips[0]).toHaveLength(28));
  it("defaults the mood", () => expect(parseReply("Hi there").mood).toBe("happy"));
  it("strips tool names written instead of called", () =>
    expect(parseReply("[mood:happy] Here is your progress.\n\n[get_goals] [make_chart(spending)] [chips: a | b]").text).toBe("Here is your progress."));
  it("keeps ordinary bracketed text", () => expect(parseReply("[mood:happy] Pay [Visible] today").text).toBe("Pay [Visible] today"));
});

describe("plainText", () => {
  it("drops tables (the cards show that data)", () =>
    expect(plainText("Here are your balances.\n\n| Account | Balance |\n| :--- | :--- |\n| Everyday | $2,140 |")).toBe("Here are your balances."));
  it("removes bold, italics, code and headings", () => expect(plainText("## Heads up\nYou owe **$1,364** on your *card* (`68%`).")).toBe("Heads up You owe $1,364 on your card (68%)."));
  it("turns a list into one line", () => expect(plainText("Next steps:\n- Pay Phone\n- Pay Electric")).toBe("Next steps: Pay Phone Pay Electric"));
  it("leaves plain sentences alone", () => expect(plainText("You have $2,140 in Everyday. Want me to move $50 to savings?")).toBe("You have $2,140 in Everyday. Want me to move $50 to savings?"));
  it("keeps a lone asterisk or minus sign", () => expect(plainText("Spending is up 3 * 2 times, down -$5.")).toBe("Spending is up 3 * 2 times, down -$5."));
});

describe("claimsCompletedAction", () => {
  it.each([
    "I've paid your phone bill.",
    "I paid the $45 to Visible.",
    "Done! Moved $50 to savings.",
    "I have transferred $100 to your Hawaii Fund.",
    "I've cancelled Hulu for you.",
    "Your electric bill is now paid.",
    "Your $15 has been refunded.",
  ])("flags a claim that money moved: %s", (t) => expect(claimsCompletedAction(t)).toBe(true));

  it.each([
    "I've proposed paying your phone bill. Tap Review to approve it.",
    "I've set that up for you to review.",
    "Want me to pay it?",
    "You paid $750 for rent on Oct 1.",
    "Your phone bill will be paid once you approve.",
    "Your rent was paid on Oct 2.",
    "You've spent $264 this week.",
  ])("allows proposals and facts: %s", (t) => expect(claimsCompletedAction(t)).toBe(false));
});

describe("claimsProposal", () => {
  it.each([
    "I've set up the payment for your $82 electric bill for you to review. Tap Review to approve it.",
    "I have proposed paying your phone bill.",
    "It's ready for you to approve.",
  ])("spots a reply that says an approval is ready: %s", (t) => expect(claimsProposal(t)).toBe(true));
  it.each(["Want me to set that up?", "Your phone bill is due Oct 19.", "I can set that up for you."])("ignores offers and facts: %s", (t) =>
    expect(claimsProposal(t)).toBe(false));
});

describe("namesToolInsteadOfCalling", () => {
  const tools = ["get_goals", "make_chart", "get_bills"];
  it("spots a tool name written in the reply", () => expect(namesToolInsteadOfCalling("Here you go.\n\n[get_goals]", tools)).toBe(true));
  it("ignores replies that don't name a tool", () => expect(namesToolInsteadOfCalling("You've saved $270 toward Spring Break.", tools)).toBe(false));
  it("matches whole names only", () => expect(namesToolInsteadOfCalling("get_goals_extra", tools)).toBe(false));
});

describe("systemPrompt", () => {
  const user = { firstName: "Gabe" } as User;
  const accounts: Account[] = [{ id: "chk", nickname: "Everyday", type: "Checking", balanceCents: 214_000, mask: "1093", isGoal: false }];
  const card: CardSummary = { accountId: "card", nickname: "Closer Card", mask: "4821", balanceCents: 136_400, limitCents: 200_000, utilization: 68, statementCloseDate: "2026-10-23", closesInDays: 6 };
  const prompt = systemPrompt(user, accounts, { card, alerts: [] });
  it("keeps the chart guidance", () => expect(prompt).toContain("make_chart"));
  it("has no emoji and the new Finn", () => {
    expect(prompt).not.toMatch(/\p{Extended_Pictographic}|coral/u);
    expect(prompt).toContain("whale-seal");
  });
  it("knows the card", () => expect(prompt).toContain("Closer Card: owes $1,364.00 of $2,000.00 limit, 68% utilization"));
  it("asks for chips", () => expect(prompt).toContain("[chips:"));
});
