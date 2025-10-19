import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getContainerRuntimeClient } from "testcontainers";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";

import { createPostgresConfigRepo } from "./configRepo.js";
import * as schema from "../schema/pg/index.js";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const PG_MIGRATIONS_DIR = resolve(TEST_DIR, "../../drizzle/pg");

async function isDockerAvailable(): Promise<boolean> {
  try {
    await getContainerRuntimeClient();
    return true;
  } catch {
    return false;
  }
}

async function applyPostgresMigrations(pool: Pool) {
  const migrationFiles = readdirSync(PG_MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const sql = readFileSync(resolve(PG_MIGRATIONS_DIR, file), "utf8");
    await pool.query(sql);
  }
}

const dockerAvailable = await isDockerAvailable();

describe.skipIf(!dockerAvailable)("Postgres migrations", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("sprongus")
      .withUsername("postgres")
      .withPassword("postgres")
      .start();

    pool = new Pool({ connectionString: container.getConnectionUri() });
    await applyPostgresMigrations(pool);
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE TABLE config_kv;");
  });

  it("applies migrations and supports basic CRUD", async () => {
    const db = drizzle(pool, { schema });
    const repo = createPostgresConfigRepo(db);

    const inserted = await repo.set("feature.alpha", true);
    expect(inserted.value).toBe(true);

    const fetched = await repo.get("feature.alpha");
    expect(fetched?.value).toBe(true);

    await repo.import(
      {
        "feature.alpha": false,
        "system.timezone": "UTC",
      },
      { mode: "merge" },
    );

    const exported = await repo.export();
    expect(exported).toEqual({
      "feature.alpha": false,
      "system.timezone": "UTC",
    });
  });
});
