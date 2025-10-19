import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const secretKvTable = sqliteTable(
  "secret_kv",
  {
    id: text("id").primaryKey(),
    ownerType: text("owner_type").notNull(),
    ownerId: text("owner_id"),
    keyName: text("key_name").notNull(),
    ciphertext: text("ciphertext").notNull(),
    dekWrapped: text("dek_wrapped").notNull(),
    nonce: text("nonce").notNull(),
    alg: text("alg").notNull(),
    version: integer("version").notNull().default(1),
    meta: text("meta"),
    hmac: text("hmac"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastRotatedAt: text("last_rotated_at"),
  },
  (table) => ({
    scopeKeyUnique: uniqueIndex("secret_kv_scope_key_unique").on(
      table.ownerType,
      table.ownerId,
      table.keyName,
    ),
    ownerScopeIdx: index("secret_kv_owner_scope_idx").on(
      table.ownerType,
      table.ownerId,
    ),
  }),
);

export type SecretKvRow = typeof secretKvTable.$inferSelect;
export type SecretKvInsert = typeof secretKvTable.$inferInsert;
