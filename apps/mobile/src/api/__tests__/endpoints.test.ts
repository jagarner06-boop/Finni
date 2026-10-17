import { api } from "../endpoints";
import { apiFetch } from "../client";
import type { FinnProfile } from "@finni/shared";
jest.mock("@/config", () => ({ config: { authMode: "demo", demoName: "Gabe", apiUrl: "http://x" } }));
jest.mock("../client", () => ({ apiFetch: jest.fn() }));
const profile: FinnProfile = { lifeStage: "student", paySchedule: "biweekly", nextPayday: null, style: "planner", handsOn: "suggest" };
it("keeps the demo name when it sends the profile", async () => {
  await api.bootstrap({ profile });
  expect(apiFetch).toHaveBeenCalledWith("/me/bootstrap", { method: "POST", body: { firstName: "Gabe", profile } });
});

it("uses the entered name instead of the configured demo name", async () => {
  await api.bootstrap({ firstName: "Jordan", profile });
  expect(apiFetch).toHaveBeenLastCalledWith("/me/bootstrap", { method: "POST", body: { firstName: "Jordan", profile } });
});
