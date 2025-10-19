import { Pool } from "pg";
import type { PoolConfig } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "../schema/pg/index.js";

export type PostgresSchema = typeof schema;
export type PostgresDrizzleDatabase = NodePgDatabase<PostgresSchema>;

export type CreatePostgresClientOptions = PoolConfig;

export interface PostgresClient {
  pool: Pool;
  db: PostgresDrizzleDatabase;
}

export function createPostgresClient(
  options: CreatePostgresClientOptions,
): PostgresClient {
  const pool = new Pool(options);
  const db = drizzle(pool, { schema });
  return { pool, db };
}
