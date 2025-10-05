import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const configKvTable = sqliteTable(
  "config_kv",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    keyUnique: uniqueIndex("config_kv_key_unique").on(table.key),
  }),
);

export type ConfigKvRow = typeof configKvTable.$inferSelect;
export type ConfigKvInsert = typeof configKvTable.$inferInsert;
