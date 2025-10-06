import { eq, like } from "drizzle-orm";

import type {
  ConfigEntry,
  ConfigRepo,
  ConfigValue,
  ExportConfigOptions,
  ImportConfigOptions,
  ListConfigOptions,
} from "@sprongus/core";
import { configKvTable } from "../schema/pg/configKv.js";
import type { PostgresDrizzleDatabase } from "./client.js";

function parseEntry(row: typeof configKvTable.$inferSelect): ConfigEntry {
  return {
    id: row.id,
    key: row.key,
    value: row.value as ConfigValue,
    updatedAt: row.updatedAt,
  };
}

export class PostgresConfigRepo implements ConfigRepo {
  constructor(private readonly db: PostgresDrizzleDatabase) {}

  async get(key: string): Promise<ConfigEntry | null> {
    const [row] = await this.db
      .select()
      .from(configKvTable)
      .where(eq(configKvTable.key, key))
      .limit(1);
    return row ? parseEntry(row) : null;
  }

  async set(key: string, value: ConfigValue): Promise<ConfigEntry> {
    const now = new Date();
    await this.db
      .insert(configKvTable)
      .values({
        key,
        value,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: configKvTable.key,
        set: {
          value,
          updatedAt: now,
        },
      });

    const row = await this.get(key);
    if (!row) {
      throw new Error(`Failed to persist config key "${key}"`);
    }
    return row;
  }

  async unset(key: string): Promise<void> {
    await this.db.delete(configKvTable).where(eq(configKvTable.key, key));
  }

  async list(options: ListConfigOptions = {}): Promise<ConfigEntry[]> {
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

    const rows = await query;
    return rows.map(parseEntry);
  }

  async import(
    records: Record<string, ConfigValue>,
    options: ImportConfigOptions = {},
  ): Promise<ConfigEntry[]> {
    const keys = Object.keys(records);
    const mode = options.mode ?? "merge";

    return this.db.transaction(async (tx) => {
      if (mode === "replace") {
        await tx.delete(configKvTable);
      }

      if (keys.length === 0) {
        return [];
      }

      const results: ConfigEntry[] = [];
      for (const key of keys) {
        const now = new Date();
        const rawValue = records[key]!;
        await tx
          .insert(configKvTable)
          .values({
            key,
            value: rawValue,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: configKvTable.key,
            set: { value: rawValue, updatedAt: now },
          });

        const [row] = await tx
          .select()
          .from(configKvTable)
          .where(eq(configKvTable.key, key))
          .limit(1);
        if (row) {
          results.push(parseEntry(row));
        }
      }

      return results.sort((a, b) => a.key.localeCompare(b.key));
    });
  }

  async export(
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

    const rows = await query;
    return rows.reduce<Record<string, ConfigValue>>((acc, row) => {
      acc[row.key] = row.value as ConfigValue;
      return acc;
    }, {});
  }
}

export function createPostgresConfigRepo(
  db: PostgresDrizzleDatabase,
): ConfigRepo {
  return new PostgresConfigRepo(db);
}
