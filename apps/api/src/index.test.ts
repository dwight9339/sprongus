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

  it("supports CRUD operations for config entries", async () => {
    const app = buildServer();

    const putRes = await app.inject({
      method: "PUT",
      url: "/v1/config/app.debug",
      payload: { value: true },
    });
    expect(putRes.statusCode).toBe(200);
    const created = putRes.json<{
      key: string;
      value: unknown;
      updatedAt: string;
    }>();
    expect(created.key).toBe("app.debug");
    expect(created.value).toBe(true);
    expect(typeof created.updatedAt).toBe("string");

    const listRes = await app.inject({
      method: "GET",
      url: "/v1/config?includeValues=true",
    });
    expect(listRes.statusCode).toBe(200);
    const list = listRes.json<Array<{ key: string }>>();
    expect(list).toHaveLength(1);
    expect(list[0]?.key).toBe("app.debug");

    const getRes = await app.inject({
      method: "GET",
      url: "/v1/config/app.debug",
    });
    expect(getRes.statusCode).toBe(200);
    const fetched = getRes.json<{ value: unknown }>();
    expect(fetched.value).toBe(true);

    const deleteRes = await app.inject({
      method: "DELETE",
      url: "/v1/config/app.debug",
    });
    expect(deleteRes.statusCode).toBe(204);

    const missingRes = await app.inject({
      method: "GET",
      url: "/v1/config/app.debug",
    });
    expect(missingRes.statusCode).toBe(404);

    await app.close();
  });

  it("imports and exports configuration maps", async () => {
    const app = buildServer();

    const importRes = await app.inject({
      method: "POST",
      url: "/v1/config:import",
      payload: {
        data: {
          "feature.alpha": true,
          "feature.beta": { enabled: false },
        },
        mode: "replace",
      },
    });
    expect(importRes.statusCode).toBe(200);
    const imported = importRes.json<Array<{ key: string }>>();
    expect(imported).toHaveLength(2);

    const exportRes = await app.inject({
      method: "GET",
      url: "/v1/config:export?prefix=feature.",
    });
    expect(exportRes.statusCode).toBe(200);
    const exported = exportRes.json<Record<string, unknown>>();
    expect(exported).toEqual({
      "feature.alpha": true,
      "feature.beta": { enabled: false },
    });

    await app.close();
  });

  it("validates invalid keys and payloads", async () => {
    const app = buildServer();

    const putRes = await app.inject({
      method: "PUT",
      url: "/v1/config/INVALID-KEY",
      payload: { value: true },
    });
    expect(putRes.statusCode).toBe(400);

    const importRes = await app.inject({
      method: "POST",
      url: "/v1/config:import",
      payload: {
        data: [],
      },
    });
    expect(importRes.statusCode).toBe(400);

    await app.close();
  });
});
