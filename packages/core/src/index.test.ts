import { describe, expect, it } from "vitest";
import { noop, version } from "./index.js";

describe("@sprongus/core", () => {
  it("exports a version string", () => {
    expect(typeof version).toBe("string");
  });

  it("noop returns void", () => {
    expect(noop()).toBeUndefined();
  });
});
