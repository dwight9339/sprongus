import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createConfigContext } from "./context.js";

describe("createConfigContext", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a local SQLite database when needed", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sprongus-cli-local-"));
    const dbPath = path.join(dir, "config.db");

    const context = await createConfigContext({ dbPath });
    await context.service.set("app.debug", true);
    const entry = await context.service.get("app.debug");
    await context.close();

    expect(entry?.value).toBe(true);
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("proxies operations to a remote API", async () => {
    const makeResponse = (
      status: number,
      body?: unknown,
      statusText = "OK",
    ): Response => {
      const init: ResponseInit = {
        status,
        statusText,
        headers: { "content-type": "application/json" },
      };
      if (body === undefined) {
        return new Response(null, init);
      }
      return new Response(JSON.stringify(body), init);
    };

    const fetchSpy = vi.fn(
      (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url =
          input instanceof URL
            ? input
            : typeof input === "string"
              ? new URL(input)
              : new URL(input.url);

        if (url.pathname === "/v1/config") {
          return Promise.resolve(
            makeResponse(200, [
              {
                id: 1,
                key: "sample",
                value: 123,
                updatedAt: new Date().toISOString(),
              },
            ]),
          );
        }
        if (url.pathname.startsWith("/v1/config/")) {
          if (init?.method === "PUT") {
            return Promise.resolve(
              makeResponse(200, {
                id: 1,
                key: "sample",
                value: 123,
                updatedAt: new Date().toISOString(),
              }),
            );
          }
          return Promise.resolve(makeResponse(204));
        }
        if (url.pathname === "/v1/config:export") {
          return Promise.resolve(makeResponse(200, { sample: 123 }));
        }
        if (url.pathname === "/v1/config:import") {
          return Promise.resolve(
            makeResponse(200, [
              {
                id: 1,
                key: "sample",
                value: 123,
                updatedAt: new Date().toISOString(),
              },
            ]),
          );
        }
        return Promise.reject(new Error(`Unhandled fetch to ${url}`));
      },
    );

    const context = await createConfigContext({
      remoteUrl: "https://api.example.com",
      fetchImpl: fetchSpy as unknown as typeof fetch,
    });

    const list = await context.service.list();
    expect(list).toHaveLength(1);

    await context.service.set("sample", 123);
    await context.service.export();
    await context.service.import({ sample: 123 }, { mode: "replace" });
    await context.service.unset("sample");
    await context.close();

    expect(fetchSpy).toHaveBeenCalled();
  });
});
