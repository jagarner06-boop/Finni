import { describe, expect, it, vi } from "vitest";
import { generateWithFallback } from "../generate.js";

const err = (status: number, message = "") => Object.assign(new Error(message), { status });
const noSleep = async () => {};

describe("generateWithFallback", () => {
  it("retries the primary once, then tries the fallback", async () => {
    const seen: string[] = [];
    const call = vi.fn(async (m: string) => {
      seen.push(m);
      if (m === "p") throw err(503);
      return "ok";
    });
    await expect(generateWithFallback(call, { primary: "p", fallback: "f" }, noSleep)).resolves.toBe("ok");
    expect(seen).toEqual(["p", "p", "f"]);
  });
  it("tries each backup in a comma-separated list until one answers", async () => {
    const seen: string[] = [];
    const call = vi.fn(async (m: string) => {
      seen.push(m);
      if (m !== "f3") throw err(429, "per minute");
      return "ok";
    });
    await expect(generateWithFallback(call, { primary: "p", fallback: "f1, f2,f3" }, noSleep)).resolves.toBe("ok");
    expect(seen).toEqual(["p", "p", "f1", "f2", "f3"]);
  });
  it("returns the primary when it works", async () => {
    const call = vi.fn(async (m: string) => m);
    await expect(generateWithFallback(call, { primary: "p", fallback: "f" }, noSleep)).resolves.toBe("p");
    expect(call).toHaveBeenCalledTimes(1);
  });
  it("throws other errors right away", async () => {
    const call = vi.fn(async () => {
      throw err(400);
    });
    await expect(generateWithFallback(call, { primary: "p", fallback: "f" }, noSleep)).rejects.toThrow();
    expect(call).toHaveBeenCalledTimes(1);
  });
  it("gives up when both are out of quota", async () => {
    await expect(
      generateWithFallback(async () => {
        throw err(429, "PerDay quota");
      }, { primary: "p", fallback: "f" }, noSleep),
    ).rejects.toThrow();
  });
});
