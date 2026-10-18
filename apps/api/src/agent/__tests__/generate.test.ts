import { describe, expect, it, vi } from "vitest";
import { generateWithFallback } from "../generate.js";

const err = (status: number, message = "") => Object.assign(new Error(message), { status });
const noSleep = async () => {};

describe("generateWithFallback", () => {
  it("retries the primary once, then tries the fallback", async () => {
    const seen: string[] = [];
    const call = vi.fn(async (m: string) => {
      seen.push(m);
      if (m === "p") throw err(500);
      return "ok";
    });
    await expect(generateWithFallback(call, { primary: "p", fallback: "f" }, noSleep)).resolves.toBe("ok");
    expect(seen).toEqual(["p", "p", "f"]);
  });
  it("tries each backup in a comma-separated list until one answers", async () => {
    const seen: string[] = [];
    const call = vi.fn(async (m: string) => {
      seen.push(m);
      if (m !== "f3") throw err(503, "high demand");
      return "ok";
    });
    await expect(generateWithFallback(call, { primary: "p", fallback: "f1, f2,f3" }, noSleep)).resolves.toBe("ok");
    expect(seen).toEqual(["p", "f1", "f2", "f3"]);
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
  it("switches away from an overloaded primary without retrying it first", async () => {
    const seen: string[] = [];
    const sleep = vi.fn(async () => {});
    const result = await generateWithFallback(async (model) => {
      seen.push(model);
      if (model === "p") throw err(503, "high demand");
      return "ready";
    }, { primary: "p", fallback: "f" }, sleep);
    expect(result).toBe("ready");
    expect(seen).toEqual(["p", "f"]);
    expect(sleep).not.toHaveBeenCalled();
  });
  it("recovers when the fallback's first attempt is also overloaded", async () => {
    const seen: string[] = [];
    const sleep = vi.fn(async () => {});
    let fallbackCalls = 0;
    const result = await generateWithFallback(async (model) => {
      seen.push(model);
      if (model === "p" || ++fallbackCalls === 1) throw err(503, "high demand");
      return "ready";
    }, { primary: "p", fallback: "f" }, sleep);
    expect(result).toBe("ready");
    expect(seen).toEqual(["p", "f", "f"]);
    expect(sleep).toHaveBeenCalledTimes(1);
  });
  it("bounds retries when all models stay overloaded", async () => {
    const seen: string[] = [];
    await expect(generateWithFallback(async (model) => {
      seen.push(model);
      throw err(503, "high demand");
    }, { primary: "p", fallback: "f" }, noSleep)).rejects.toMatchObject({ status: 503 });
    expect(seen).toEqual(["p", "f", "f"]);
  });
  it("still retries a single configured model only once", async () => {
    const call = vi.fn().mockRejectedValue(err(503));
    await expect(generateWithFallback(call, { primary: "p", fallback: "p" }, noSleep)).rejects.toMatchObject({ status: 503 });
    expect(call).toHaveBeenCalledTimes(2);
  });
  it("does not wait or retry a fallback's daily quota failure", async () => {
    const sleep = vi.fn(async () => {});
    const seen: string[] = [];
    await expect(generateWithFallback(async (model) => {
      seen.push(model);
      throw err(model === "p" ? 503 : 429, "PerDay quota");
    }, { primary: "p", fallback: "f" }, sleep)).rejects.toMatchObject({ status: 429 });
    expect(seen).toEqual(["p", "f"]);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("reports which model failed and whether recovery will continue", async () => {
    const failures: unknown[] = [];
    await expect(generateWithFallback(async (model) => {
      if (model === "p") throw err(503, "high demand");
      return "ok";
    }, { primary: "p", fallback: "f" }, noSleep, (failure) => failures.push(failure))).resolves.toBe("ok");
    expect(failures).toEqual([{ model: "p", attempt: 1, status: 503, next: "fallback" }]);
  });
  it("skips a requested wait that exceeds the bounded retry window", async () => {
    const sleep = vi.fn(async () => {});
    const seen: string[] = [];
    const result = await generateWithFallback(async (model) => {
      seen.push(model);
      if (model === "p") throw err(429, "retry in 60s");
      return "ok";
    }, { primary: "p", fallback: "f" }, sleep);
    expect(result).toBe("ok");
    expect(seen).toEqual(["p", "f"]);
    expect(sleep).not.toHaveBeenCalled();
  });

});
