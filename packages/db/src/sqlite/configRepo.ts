import { eq, like } from "drizzle-orm";

import type {
  ConfigEntry,
  ConfigRepo,
  ConfigValue,
  ExportConfigOptions,
  ImportConfigOptions,
  ListConfigOptions,
} from "@sprongus/core";
import { configKvTable } from "../schema/sqlite/configKv.js";
import type { SqliteDrizzleDatabase } from "./client.js";

function serializeValue(value: ConfigValue): string {
  return JSON.stringify(value ?? null);
}

function parseValue(raw: string): ConfigValue {
  try {
    return JSON.parse(raw) as ConfigValue;
  } catch {
    return raw;
  }
}

function parseEntry(row: typeof configKvTable.$inferSelect): ConfigEntry {
  return {
    id: row.id,
    key: row.key,
    value: parseValue(row.value),
    updatedAt: new Date(row.updatedAt),
  };
}

export class SqliteConfigRepo implements ConfigRepo {
  constructor(private readonly db: SqliteDrizzleDatabase) {}

  get(key: string): Promise<ConfigEntry | null> {
    const row = this.db
      .select()
      .from(configKvTable)
      .where(eq(configKvTable.key, key))
      .get();
    return Promise.resolve(row ? parseEntry(row) : null);
  }

  async set(key: string, value: ConfigValue): Promise<ConfigEntry> {
    const timestamp = new Date().toISOString();
    const serialized = serializeValue(value);
    this.db
      .insert(configKvTable)
      .values({
        key,
        value: serialized,
        updatedAt: timestamp,
      })
      .onConflictDoUpdate({
        target: configKvTable.key,
        set: {
          value: serialized,
          updatedAt: timestamp,
        },
      })
      .run();

    const row = await this.get(key);
    if (!row) {
      throw new Error(`Failed to persist config key "${key}"`);
    }
    return row;
  }

  unset(key: string): Promise<void> {
    this.db.delete(configKvTable).where(eq(configKvTable.key, key)).run();
    return Promise.resolve();
  }

  list(options: ListConfigOptions = {}): Promise<ConfigEntry[]> {
    const { prefix, limit, offset } = options;
    const where = prefix ? like(configKvTable.key, `${prefix}%`) : undefined;

    let query = this.db
      .select()
      .from(configKvTable)
      .orderBy(configKvTable.key)
      .$dynamic();

    if (where) {
      query = query.where(where);
    }
    if (typeof limit === "number") {
      query = query.limit(limit);
    }
    if (typeof offset === "number") {
      query = query.offset(offset);
    }

    const rows = query.all();
    return Promise.resolve(rows.map(parseEntry));
  }

  import(
    records: Record<string, ConfigValue>,
    options: ImportConfigOptions = {},
  ): Promise<ConfigEntry[]> {
    const keys = Object.keys(records);
    const mode = options.mode ?? "merge";

    const results = this.db.transaction<ConfigEntry[]>((tx) => {
      if (mode === "replace") {
        tx.delete(configKvTable).run();
      }

      if (keys.length === 0) {
        return [];
      }

      const results: ConfigEntry[] = [];
      for (const key of keys) {
        const timestamp = new Date().toISOString();
        const rawValue = records[key]!;
        const serialized = serializeValue(rawValue);
        tx.insert(configKvTable)
          .values({
            key,
            value: serialized,
            updatedAt: timestamp,
          })
          .onConflictDoUpdate({
            target: configKvTable.key,
            set: {
              value: serialized,
              updatedAt: timestamp,
            },
          })
          .run();

        const row = tx
          .select()
          .from(configKvTable)
          .where(eq(configKvTable.key, key))
          .get();
        if (row) {
          results.push(parseEntry(row));
        }
      }

      return results.sort((a, b) => a.key.localeCompare(b.key));
    });

    return Promise.resolve(results);
  }

  export(
    options: ExportConfigOptions = {},
  ): Promise<Record<string, ConfigValue>> {
    const { prefix } = options;
    const where = prefix ? like(configKvTable.key, `${prefix}%`) : undefined;

    let query = this.db
      .select({ key: configKvTable.key, value: configKvTable.value })
      .from(configKvTable)
      .orderBy(configKvTable.key)
      .$dynamic();
    if (where) {
      query = query.where(where);
    }
    const rows = query.all();
    const mapped = rows.reduce<Record<string, ConfigValue>>((acc, row) => {
      acc[row.key] = parseValue(row.value);
      return acc;
    }, {});

    return Promise.resolve(mapped);
  }
}

export function createSqliteConfigRepo(db: SqliteDrizzleDatabase): ConfigRepo {
  return new SqliteConfigRepo(db);
}
