import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import type { ConfigEntry } from "@sprongus/core";

import { createPostgresConfigRepo } from "./configRepo.js";
import * as schema from "../schema/pg/index.js";

const connectionString = process.env.SPRONGUS_TEST_PG_URL;

describe.skipIf(!connectionString)("PostgresConfigRepo", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS config_kv (
        id serial PRIMARY KEY,
        key text NOT NULL UNIQUE,
        value jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  });

  afterAll(async () => {
    await pool.query("DROP TABLE IF EXISTS config_kv;");
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE TABLE config_kv;");
  });

  it("performs CRUD operations", async () => {
    const db = drizzle(pool, { schema });
    const repo = createPostgresConfigRepo(db);

    const inserted = await repo.set("app.debug", true);
    expect(inserted.value).toBe(true);

    const fetched = await repo.get("app.debug");
    expect(fetched?.value).toBe(true);

    await repo.set("app.debug", false);
    const updated = await repo.get("app.debug");
    expect(updated?.value).toBe(false);

    await repo.unset("app.debug");
    const missing = await repo.get("app.debug");
    expect(missing).toBeNull();
  });

  it("imports and exports maps", async () => {
    const db = drizzle(pool, { schema });
    const repo = createPostgresConfigRepo(db);

    await repo.import(
      {
        "feature.alpha": true,
        "feature.beta": "in-progress",
      },
      { mode: "replace" },
    );

    const map = await repo.export();
    expect(map).toEqual({
      "feature.alpha": true,
      "feature.beta": "in-progress",
    });

    await repo.import({
      "feature.beta": "ready",
      "system.locale": "en-US",
    });

    const list = await repo.list({ prefix: "feature." });
    expect(list.map((item: ConfigEntry) => item.key)).toEqual([
      "feature.alpha",
      "feature.beta",
    ]);

    const exported = await repo.export();
    expect(exported).toEqual({
      "feature.alpha": true,
      "feature.beta": "ready",
      "system.locale": "en-US",
    });
  });
});
