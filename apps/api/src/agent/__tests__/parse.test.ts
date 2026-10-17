import type { Account, CardSummary } from "@finni/shared";
import { describe, expect, it } from "vitest";
import type { User } from "../../db/schema.js";
import { DEFAULT_CHIPS, parseReply } from "../parse.js";
import { systemPrompt } from "../prompt.js";

describe("parseReply", () => {
  it("reads mood, text and chips", () =>
    expect(parseReply("[mood:worried] You owe $1,364.00. [chips: Pay it down | Why 9%?]")).toEqual({ mood: "worried", text: "You owe $1,364.00.", chips: ["Pay it down", "Why 9%?"] }));
  it("falls back to default chips", () => expect(parseReply("Hello").chips).toEqual(DEFAULT_CHIPS));
  it("keeps at most three chips", () => expect(parseReply("[mood:happy] Hi [chips: a | b | c | d]").chips).toHaveLength(3));
  it("trims long chips", () => expect(parseReply("[mood:happy] Hi [chips: " + "x".repeat(40) + "]").chips[0]).toHaveLength(28));
  it("defaults the mood", () => expect(parseReply("Hi there").mood).toBe("happy"));
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
