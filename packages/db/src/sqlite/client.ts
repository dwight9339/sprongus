import Database from "better-sqlite3";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import * as schema from "../schema/sqlite/index.js";

export type SqliteSchema = typeof schema;
export type SqliteDrizzleDatabase = BetterSQLite3Database<SqliteSchema>;

export interface CreateSqliteClientOptions extends Database.Options {
  filePath: string;
  busyTimeoutMs?: number;
}

export interface SqliteClient {
  connection: BetterSqliteDatabase;
  db: SqliteDrizzleDatabase;
}

export function createSqliteClient(
  options: CreateSqliteClientOptions,
): SqliteClient {
  const { filePath, busyTimeoutMs = 5000, ...sqliteOptions } = options;
  const connection = new Database(filePath, sqliteOptions);
  if (busyTimeoutMs > 0) {
    connection.pragma(`busy_timeout = ${busyTimeoutMs}`);
  }
  const db = drizzle(connection, { schema });
  return { connection, db };
}
