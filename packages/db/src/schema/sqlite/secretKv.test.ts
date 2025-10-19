import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync, readFileSync } from "node:fs";

import { eq } from "drizzle-orm";

import { createSqliteClient, type SqliteClient } from "../../sqlite/client.js";
import { secretKvTable } from "./secretKv.js";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const SQLITE_MIGRATIONS_DIR = resolve(TEST_DIR, "../../../drizzle/sqlite");

function applySqliteMigrations(connection: SqliteClient["connection"]) {
  const migrationFiles = readdirSync(SQLITE_MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const sql = readFileSync(resolve(SQLITE_MIGRATIONS_DIR, file), "utf8");
    connection.exec(sql);
  }
}

const sqliteBindingsAvailable = (() => {
  try {
    const probe = createSqliteClient({ filePath: ":memory:" });
    probe.connection.close();
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!sqliteBindingsAvailable)("sqlite secret_kv schema", () => {
  let client: SqliteClient | null = null;

  beforeEach(() => {
    client = createSqliteClient({ filePath: ":memory:" });
    applySqliteMigrations(client.connection);
  });

  afterEach(() => {
    client?.connection.close();
    client = null;
  });

  it("applies migrations with expression-backed indexes", () => {
    const scopeKeyIdx = client!.connection
      .prepare(
        "SELECT sql FROM sqlite_master WHERE type = 'index' AND name = 'secret_kv_scope_key_unique';",
      )
      .get();
    expect(scopeKeyIdx?.sql).toContain("IFNULL(owner_id, '')");

    const ownerScopeIdx = client!.connection
      .prepare(
        "SELECT sql FROM sqlite_master WHERE type = 'index' AND name = 'secret_kv_owner_scope_idx';",
      )
      .get();
    expect(ownerScopeIdx?.sql).toContain("IFNULL(owner_id, '')");
  });

  it("enforces unique key per normalized scope", () => {
    const db = client!.db;

    db.insert(secretKvTable)
      .values({
        id: "sec_system_1",
        ownerType: "system",
        ownerId: null,
        keyName: "providers/notion/api_token",
        ciphertext: "ciphertext",
        dekWrapped: "wrapped",
        nonce: "nonce",
        alg: "xchacha20poly1305",
      })
      .run();

    expect(() =>
      db
        .insert(secretKvTable)
        .values({
          id: "sec_system_2",
          ownerType: "system",
          ownerId: null,
          keyName: "providers/notion/api_token",
          ciphertext: "ciphertext2",
          dekWrapped: "wrapped2",
          nonce: "nonce2",
          alg: "xchacha20poly1305",
        })
        .run(),
    ).toThrowError(/secret_kv_scope_key_unique/);

    db.insert(secretKvTable)
      .values({
        id: "sec_user_1",
        ownerType: "user",
        ownerId: "user-123",
        keyName: "providers/notion/api_token",
        ciphertext: "ciphertext",
        dekWrapped: "wrapped",
        nonce: "nonce",
        alg: "xchacha20poly1305",
      })
      .run();

    expect(() =>
      db
        .insert(secretKvTable)
        .values({
          id: "sec_user_2",
          ownerType: "user",
          ownerId: "user-123",
          keyName: "providers/notion/api_token",
          ciphertext: "ciphertext2",
          dekWrapped: "wrapped2",
          nonce: "nonce2",
          alg: "xchacha20poly1305",
        })
        .run(),
    ).toThrowError(/secret_kv_scope_key_unique/);
  });

  it("stores ciphertext payloads with defaults applied", () => {
    const db = client!.db;
    const lastRotatedAt = new Date().toISOString();

    db.insert(secretKvTable)
      .values({
        id: "sec_user_meta",
        ownerType: "user",
        ownerId: "user-456",
        keyName: "providers/notion/api_token",
        ciphertext: "ciphertext",
        dekWrapped: "wrapped",
        nonce: "nonce",
        alg: "xchacha20poly1305",
        version: 3,
        meta: JSON.stringify({ provider: "notion" }),
        hmac: "digest",
        lastRotatedAt,
      })
      .run();

    const row = db
      .select()
      .from(secretKvTable)
      .where(eq(secretKvTable.id, "sec_user_meta"))
      .get();

    expect(row).toBeDefined();
    expect(row?.version).toBe(3);
    expect(row?.meta).toBe(JSON.stringify({ provider: "notion" }));
    expect(row?.hmac).toBe("digest");
    expect(row?.lastRotatedAt).toBe(lastRotatedAt);
    expect(row?.createdAt).toBeDefined();
    expect(new Date(row!.createdAt).toString()).not.toBe("Invalid Date");
    expect(row?.updatedAt).toBeDefined();
    expect(new Date(row!.updatedAt).toString()).not.toBe("Invalid Date");
  });
});
