import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const secretKvTable = pgTable(
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
    meta: jsonb("meta").$type<Record<string, unknown> | null>(),
    hmac: text("hmac"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastRotatedAt: timestamp("last_rotated_at", { withTimezone: true }),
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
