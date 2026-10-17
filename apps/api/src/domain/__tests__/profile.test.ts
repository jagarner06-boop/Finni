import type { FinnProfile } from "@finni/shared";
import { expect, it } from "vitest";
import { finnProfileSchema } from "../profile.js";

const valid: FinnProfile = { lifeStage: "student", paySchedule: "biweekly", nextPayday: "2026-10-23", style: "planner", handsOn: "suggest" };
it("accepts a profile from the app", () => expect(finnProfileSchema.parse(valid)).toEqual(valid));
it("accepts Not sure as a null payday", () => expect(finnProfileSchema.parse({ ...valid, nextPayday: null }).nextPayday).toBeNull());
it("rejects a label instead of a date", () => expect(finnProfileSchema.safeParse({ ...valid, nextPayday: "Fri, Oct 23" }).success).toBe(false));
it("rejects an unknown style", () => expect(finnProfileSchema.safeParse({ ...valid, style: "wild" }).success).toBe(false));
