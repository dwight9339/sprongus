export type {
  ConfigEntry,
  ConfigRepo,
  ConfigRecord,
  ConfigValue,
  ExportConfigOptions,
  ImportConfigOptions,
  ImportMode,
  ListConfigOptions,
} from "@sprongus/core";
export {
  createSqliteClient,
  type CreateSqliteClientOptions,
  type SqliteClient,
  type SqliteDrizzleDatabase,
} from "./sqlite/client.js";
export { createSqliteConfigRepo } from "./sqlite/configRepo.js";
export {
  createPostgresClient,
  type CreatePostgresClientOptions,
  type PostgresClient,
  type PostgresDrizzleDatabase,
} from "./pg/client.js";
export { createPostgresConfigRepo } from "./pg/configRepo.js";
export * as sqliteSchema from "./schema/sqlite/index.js";
export * as postgresSchema from "./schema/pg/index.js";
