import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import { createConfigService } from "./service.js";
import type {
  ConfigEntry,
  ConfigRepo,
  ConfigValue,
  ConfigRecord,
  ListConfigOptions,
  ImportConfigOptions,
  ExportConfigOptions,
} from "./types.js";

function createMockEntry(overrides: Partial<ConfigEntry> = {}): ConfigEntry {
  return {
    id: 1,
    key: "app.debug",
    value: true,
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  };
}

function createMockRepo(): {
  repo: ConfigRepo;
  spies: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    unset: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
    import: ReturnType<typeof vi.fn>;
    export: ReturnType<typeof vi.fn>;
  };
} {
  const get: ConfigRepo["get"] = vi.fn((_key: string) => {
    void _key;
    return Promise.resolve<ConfigEntry | null>(null);
  });
  const set: ConfigRepo["set"] = vi.fn((key: string, value: ConfigValue) =>
    Promise.resolve(createMockEntry({ key, value })),
  );
  const unset: ConfigRepo["unset"] = vi.fn((_key: string) => {
    void _key;
    return Promise.resolve();
  });
  const list: ConfigRepo["list"] = vi.fn((_options?: ListConfigOptions) => {
    void _options;
    return Promise.resolve([createMockEntry()]);
  });
  const importFn: ConfigRepo["import"] = vi.fn(
    (_records: ConfigRecord, _options?: ImportConfigOptions) => {
      void _records;
      void _options;
      return Promise.resolve([createMockEntry()]);
    },
  );
  const exportFn: ConfigRepo["export"] = vi.fn(
    (_options?: ExportConfigOptions) => {
      void _options;
      return Promise.resolve({ "app.debug": true });
    },
  );

  const repo: ConfigRepo = {
    get,
    set,
    unset,
    list,
    import: importFn,
    export: exportFn,
  };

  const spies = {
    get,
    set,
    unset,
    list,
    import: importFn,
    export: exportFn,
  };

  return { repo, spies };
}

describe("createConfigService", () => {
  it("delegates to repo for valid keys", async () => {
    const { repo, spies } = createMockRepo();
    const service = createConfigService({ repo });

    await service.get("app.debug");

    expect(spies.get).toHaveBeenCalledWith("app.debug");
  });

  it("validates config keys", async () => {
    const { repo, spies } = createMockRepo();
    const service = createConfigService({ repo });

    await expect(service.get("Invalid Key")).rejects.toBeInstanceOf(ZodError);
    expect(spies.get).not.toHaveBeenCalled();
  });

  it("validates config values on set", async () => {
    const { repo, spies } = createMockRepo();
    const service = createConfigService({ repo });

    await expect(
      service.set("app.debug", undefined as unknown as ConfigValue),
    ).rejects.toBeInstanceOf(ZodError);
    expect(spies.set).not.toHaveBeenCalled();
  });

  it("validates list options and forwards them", async () => {
    const { repo, spies } = createMockRepo();
    const service = createConfigService({ repo });

    await service.list({ prefix: "app.", limit: 10, offset: 0 });
    expect(spies.list).toHaveBeenCalledWith({
      prefix: "app.",
      limit: 10,
      offset: 0,
    });
  });

  it("rejects invalid list options", async () => {
    const { repo } = createMockRepo();
    const service = createConfigService({ repo });

    await expect(
      service.list({ prefix: "app.debug", limit: 0 }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("validates import payloads", async () => {
    const { repo, spies } = createMockRepo();
    const service = createConfigService({ repo });

    await service.import(
      {
        "app.debug": true,
        "feature.alpha": false,
      },
      { mode: "replace" },
    );

    expect(spies.import).toHaveBeenCalledWith(
      {
        "app.debug": true,
        "feature.alpha": false,
      },
      { mode: "replace" },
    );
  });

  it("rejects invalid import payloads", async () => {
    const { repo } = createMockRepo();
    const service = createConfigService({ repo });

    await expect(
      service.import({
        "app.debug": undefined,
      } as unknown as ConfigRecord),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("validates export options", async () => {
    const { repo, spies } = createMockRepo();
    const service = createConfigService({ repo });

    await service.export({ prefix: "feature." });
    expect(spies.export).toHaveBeenCalledWith({ prefix: "feature." });
  });
});
