import { describe, expect, it } from "vitest";
import { demoSubFromHeader, stepUpFresh } from "../demoToken.js";

describe("demoSubFromHeader", () => {
  it("maps a device token to a demo user", () => expect(demoSubFromHeader("Bearer demo.0f8e2c1a-77b1-4a5e-9c3d-1a2b3c4d5e6f")).toBe("demo|0f8e2c1a-77b1-4a5e-9c3d-1a2b3c4d5e6f"));
  it("rejects garbage", () => {
    for (const h of [undefined, "", "Bearer garbage", "Bearer demo.short", "Bearer demo.bad id with spaces!", "demo.0f8e2c1a-77b1-4a5e"]) expect(demoSubFromHeader(h)).toBeNull();
  });
});

describe("stepUpFresh", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  it("accepts a confirmation in the last 5 minutes", () => expect(stepUpFresh(new Date("2026-10-17T11:56:00Z"), now)).toBe(true));
  it("rejects an old one", () => expect(stepUpFresh(new Date("2026-10-17T11:54:00Z"), now)).toBe(false));
  it("rejects none", () => expect(stepUpFresh(null, now)).toBe(false));
});
