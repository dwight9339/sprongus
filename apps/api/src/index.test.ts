import { describe, it, expect } from "vitest";
import { buildServer } from "./index.js";

describe("@sprongus/api", () => {
  it("/health returns ok", async () => {
    const app = buildServer();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });
});
