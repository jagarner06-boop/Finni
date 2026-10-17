import type { CashflowForecast } from "@finni/shared";
import { expect, it, vi } from "vitest";
import type { User } from "../../db/schema.js";
import { runTool, type ToolContext } from "../tools.js";
const mocks = vi.hoisted(() => ({ cashflow: vi.fn() }));
vi.mock("../../env.js", () => ({ env: {} }));
vi.mock("../../db/client.js", () => ({ db: {}, schema: {} }));
vi.mock("../../services/cashflow.js", () => ({ getCashflow: mocks.cashflow }));
const forecast: CashflowForecast = {
  balanceCents: 214_000, paycheck: { date: "2026-10-29", amountCents: 62_000, source: "Campus job", basis: "deposits" }, untilDate: "2026-10-28",
  commitments: [
    { kind: "goal", id: "car", label: "Car repair", date: "2026-10-17", amountCents: 4_000 },
    { kind: "bill", id: "b", label: "Phone", date: "2026-10-19", amountCents: 4_500 },
    { kind: "goal", id: "hawaii", label: "Hawaii Fund", date: "2026-10-20", amountCents: 5_000 },
    { kind: "goal", id: "hawaii", label: "Hawaii Fund", date: "2026-10-27", amountCents: 5_000 },
  ], billsCents: 4_500, goalsCents: 14_000, safeCents: 195_500, shortCents: 0, firstShort: null,
};
const ctx = (): ToolContext => ({ user: { id: "u" } as User, cards: [], actionIds: [], seenCents: new Set<number>() });
it("answers can-I-afford with the server's numbers", async () => {
  mocks.cashflow.mockResolvedValue(forecast);
  const c = ctx();
  expect(await runTool("safe_to_spend", { amount: 2000 }, c)).toMatchObject({ checking: 2140, safe_to_spend: 1955, can_afford: false, left_after: -45, counted_through: "2026-10-28", next_paycheck: { date: "2026-10-29", amount: 620, from: "Campus job" } });
  expect(c.cards).toEqual([{ type: "safe_to_spend", forecast, askedCents: 200_000 }]);
});
it("says when it found no paycheck", async () => {
  mocks.cashflow.mockResolvedValue({ ...forecast, paycheck: null });
  expect(await runTool("safe_to_spend", {}, ctx())).toMatchObject({ next_paycheck: null, note: "No regular paycheck found, so this counts the next 14 days." });
});
it("needs Checking", async () => {
  mocks.cashflow.mockResolvedValue(null);
  expect(await runTool("safe_to_spend", {}, ctx())).toEqual({ error: "No checking account found." });
});
