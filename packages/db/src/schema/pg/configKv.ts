import {
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const configKvTable = pgTable(
  "config_kv",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    keyUnique: uniqueIndex("config_kv_key_unique").on(table.key),
  }),
);

export type ConfigKvRow = typeof configKvTable.$inferSelect;
export type ConfigKvInsert = typeof configKvTable.$inferInsert;
