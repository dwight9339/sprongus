import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createSqliteConfigRepo } from "./configRepo.js";
import { createSqliteClient, type SqliteClient } from "./client.js";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const SQLITE_MIGRATIONS_DIR = resolve(TEST_DIR, "../../drizzle/sqlite");

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

describe.skipIf(!sqliteBindingsAvailable)("SqliteConfigRepo", () => {
  let client: SqliteClient | null = null;

  beforeEach(() => {
    client = createSqliteClient({ filePath: ":memory:" });
    applySqliteMigrations(client.connection);
  });

  afterEach(() => {
    client?.connection.close();
    client = null;
  });

  it("sets and retrieves config values", async () => {
    const repo = createSqliteConfigRepo(client!.db);
    const inserted = await repo.set("app.theme", { darkMode: true });

    expect(inserted.key).toBe("app.theme");
    expect(inserted.value).toEqual({ darkMode: true });
    expect(inserted.updatedAt).toBeInstanceOf(Date);

    const fetched = await repo.get("app.theme");
    expect(fetched).not.toBeNull();
    expect(fetched?.value).toEqual({ darkMode: true });
  });

  it("lists configs with optional prefix filtering", async () => {
    const repo = createSqliteConfigRepo(client!.db);
    await repo.set("feature.alpha", true);
    await repo.set("feature.beta", false);
    await repo.set("system.timezone", "UTC");

    const all = await repo.list();
    expect(all.map((entry) => entry.key)).toEqual([
      "feature.alpha",
      "feature.beta",
      "system.timezone",
    ]);

    const filtered = await repo.list({ prefix: "feature." });
    expect(filtered.map((entry) => entry.key)).toEqual([
      "feature.alpha",
      "feature.beta",
    ]);
  });

  it("imports and exports configuration maps", async () => {
    const repo = createSqliteConfigRepo(client!.db);

    await repo.import(
      {
        "app.locale": "en-US",
        "app.theme": "light",
      },
      { mode: "replace" },
    );

    const exported = await repo.export();
    expect(exported).toEqual({
      "app.locale": "en-US",
      "app.theme": "light",
    });

    await repo.import({
      "app.theme": "dark",
      "system.timezone": "UTC",
    });

    const map = await repo.export();
    expect(map).toEqual({
      "app.locale": "en-US",
      "app.theme": "dark",
      "system.timezone": "UTC",
    });
  });
});
