import type { Account, CardSummary } from "@finni/shared";
import { describe, expect, it } from "vitest";
import type { User } from "../../db/schema.js";
import { DEFAULT_CHIPS, namesToolInsteadOfCalling, parseReply } from "../parse.js";
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
  it("removes emoji sequences from replies and chips without changing amounts", () => {
    expect(parseReply('[mood:happy] Saved $50! 🎉 👩🏽‍💻 🇺🇸 [chips: View goals 🎯 | 👍🏽 | Save $25]')).toEqual({
      mood: 'happy', text: 'Saved $50!', chips: ['View goals', 'Save $25'],
    });
  });
  it("unwraps a JSON reply instead of displaying raw data", () => {
    expect(parseReply('```json\n{"text":"Ready 🎉","mood":"happy","chips":["Review"]}\n```')).toEqual({ mood: 'happy', text: 'Ready', chips: ['Review'] });
  });
  it("does not display tool payloads as a reply", () => {
    expect(parseReply('{"name":"propose_goal","args":{"name":"Laptop","target_amount":900}}').text).toBe("I couldn't finish that request. Please try again.");
  });
  it.each([
    '{"text":"propose_goal({\\"name\\":\\"Laptop\\"})"}',
    '[mood:happy] {"name":"propose_transfer","args":{"amount":50}}',
    '[mood:happy] ```json\n{"name":"propose_goal"}\n```',
  ])('rejects wrapped tool payloads: %s', (raw) => {
    expect(parseReply(raw).text).toBe("I couldn't finish that request. Please try again.");
  });
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
