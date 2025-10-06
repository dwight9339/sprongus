import { describe, expect, it } from "vitest";

import {
  configKeySchema,
  createConfigService,
  type ConfigRepo,
} from "./index.js";

function createNoopRepo(): ConfigRepo {
  return {
    get() {
      return Promise.resolve(null);
    },
    set(key, value) {
      return Promise.resolve({
        id: 1,
        key,
        value,
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      });
    },
    unset() {
      return Promise.resolve();
    },
    list() {
      return Promise.resolve([]);
    },
    import() {
      return Promise.resolve([]);
    },
    export() {
      return Promise.resolve({});
    },
  };
}

describe("@sprongus/core exports", () => {
  it("exposes the config key schema", () => {
    expect(() => configKeySchema.parse("app.debug")).not.toThrow();
  });

  it("creates a config service instance", async () => {
    const repo = createNoopRepo();
    const service = createConfigService({ repo });

    await expect(service.set("app.debug", true)).resolves.toMatchObject({
      key: "app.debug",
      value: true,
    });
  });
});
