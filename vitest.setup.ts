import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { vi } from "vitest";
import type {
  ConfigEntry,
  ConfigRepo,
  ConfigValue,
  ExportConfigOptions,
  ImportConfigOptions,
  ListConfigOptions,
} from "@sprongus/core";
import type {
  CreatePostgresClientOptions,
  CreateSqliteClientOptions,
  PostgresClient,
  SqliteClient,
} from "@sprongus/db";

interface StoredRecord {
  id: number;
  value: ConfigValue;
  updatedAt: Date;
}

interface StoreState {
  rows: Map<string, StoredRecord>;
  nextId: number;
}

const cloneValue = (value: ConfigValue): ConfigValue =>
  JSON.parse(JSON.stringify(value ?? null)) as ConfigValue;

const toEntry = (key: string, record: StoredRecord): ConfigEntry => ({
  id: record.id,
  key,
  value: cloneValue(record.value),
  updatedAt: new Date(record.updatedAt.getTime()),
});

const createStoreState = (): StoreState => ({
  rows: new Map(),
  nextId: 1,
});

const sqliteStores = new Map<string, StoreState>();
const postgresStores = new Map<string, StoreState>();

const ensureStore = (map: Map<string, StoreState>, key: string): StoreState => {
  const storeKey = key || "__default__";
  let state = map.get(storeKey);
  if (!state) {
    state = createStoreState();
    map.set(storeKey, state);
  }
  return state;
};

const coerceStore = (value: unknown): StoreState => {
  if (value && typeof value === "object") {
    const candidate = value as StoreState;
    if (candidate.rows instanceof Map && typeof candidate.nextId === "number") {
      return candidate;
    }
  }
  return createStoreState();
};

const oclifHome = path.join(os.tmpdir(), "sprongus-oclif");
const oclifCacheHome = path.join(oclifHome, "cache");
fs.mkdirSync(oclifCacheHome, { recursive: true });
process.env.OCLIF_CLIENT_HOME = oclifHome;
process.env.OCLIF_CONFIG_HOME = oclifHome;
process.env.OCLIF_DATA_HOME = oclifHome;
process.env.OCLIF_CACHE_HOME = oclifCacheHome;

function createRepo(state: StoreState): ConfigRepo {
  function get(key: string): Promise<ConfigEntry | null> {
    const record = state.rows.get(key);
    return Promise.resolve(record ? toEntry(key, record) : null);
  }

  function set(key: string, value: ConfigValue): Promise<ConfigEntry> {
    const now = new Date();
    const cloned = cloneValue(value);
    const existing = state.rows.get(key);
    if (existing) {
      existing.value = cloned;
      existing.updatedAt = now;
      return Promise.resolve(toEntry(key, existing));
    }
    const record: StoredRecord = {
      id: state.nextId++,
      value: cloned,
      updatedAt: now,
    };
    state.rows.set(key, record);
    return Promise.resolve(toEntry(key, record));
  }

  function unset(key: string): Promise<void> {
    state.rows.delete(key);
    return Promise.resolve();
  }

  function list(options: ListConfigOptions = {}): Promise<ConfigEntry[]> {
    const { prefix, limit, offset } = options;
    let entries = Array.from(state.rows.entries()).map(([entryKey, record]) =>
      toEntry(entryKey, record),
    );
    if (prefix) {
      entries = entries.filter((entry) => entry.key.startsWith(prefix));
    }
    entries.sort((a, b) => a.key.localeCompare(b.key));

    const start = typeof offset === "number" ? offset : 0;
    const end = typeof limit === "number" ? start + limit : undefined;
    return Promise.resolve(entries.slice(start, end));
  }

  async function importRecords(
    records: Record<string, ConfigValue>,
    options: ImportConfigOptions = {},
  ): Promise<ConfigEntry[]> {
    if (options.mode === "replace") {
      state.rows.clear();
      state.nextId = 1;
    }
    const keys = Object.keys(records);
    const inserted: ConfigEntry[] = [];
    for (const key of keys) {
      inserted.push(await set(key, records[key]!));
    }
    inserted.sort((a, b) => a.key.localeCompare(b.key));
    return inserted;
  }

  async function exportRecords(
    options: ExportConfigOptions = {},
  ): Promise<Record<string, ConfigValue>> {
    const entries = await list({ prefix: options.prefix });
    const result: Record<string, ConfigValue> = {};
    for (const entry of entries) {
      result[entry.key] = cloneValue(entry.value);
    }
    return result;
  }

  return {
    get,
    set,
    unset,
    list,
    import: importRecords,
    export: exportRecords,
  };
}

vi.mock("@sprongus/db", () => {
  function createSqliteClient(
    options: CreateSqliteClientOptions,
  ): SqliteClient {
    const { filePath } = options;
    const state =
      filePath && filePath !== ":memory:"
        ? ensureStore(sqliteStores, filePath)
        : createStoreState();
    const client = {
      connection: {
        exec: () => {},
        close: () => {},
      },
      db: state,
    };
    return client as unknown as SqliteClient;
  }

  function createSqliteConfigRepo(db: unknown): ConfigRepo {
    return createRepo(coerceStore(db));
  }

  function createPostgresClient(
    options: CreatePostgresClientOptions,
  ): PostgresClient {
    const key = JSON.stringify(options ?? {});
    const state = ensureStore(postgresStores, key);
    const client = {
      pool: {
        end: async () => {},
      },
      db: state,
    };
    return client as unknown as PostgresClient;
  }

  function createPostgresConfigRepo(db: unknown): ConfigRepo {
    return createRepo(coerceStore(db));
  }

  return {
    CONFIG_KV_SQLITE_SCHEMA_SQL: "-- mocked schema for tests --",
    createSqliteClient,
    createSqliteConfigRepo,
    createPostgresClient,
    createPostgresConfigRepo,
  };
});
