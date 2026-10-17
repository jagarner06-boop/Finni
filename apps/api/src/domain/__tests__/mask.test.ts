import { describe, expect, it } from "vitest";
import { maskFor } from "../mask.js";

describe("maskFor", () => {
  it("is four digits", () => expect(maskFor("c0b5cee2-687f-4485-947a-a25a413101e5")).toMatch(/^\d{4}$/));
  it("is deterministic", () => expect(maskFor("abc")).toBe(maskFor("abc")));
  it("differs for different ids", () => expect(maskFor("abc")).not.toBe(maskFor("abd")));
});
