import {
  CONFIG_KV_SQLITE_SCHEMA_SQL,
  createPostgresClient,
  createPostgresConfigRepo,
  createSqliteClient,
  createSqliteConfigRepo,
  type PostgresClient,
  type SqliteClient,
} from "@sprongus/db";
import type { ConfigService } from "@sprongus/core";
import { createConfigService } from "@sprongus/core";

import type { ApiEnv } from "../env.js";

export interface ConfigResources {
  service: ConfigService;
  close(): Promise<void>;
}

export function createConfigResources(env: ApiEnv): ConfigResources {
  if (env.DATABASE_URL && env.DATABASE_URL.length > 0) {
    const client: PostgresClient = createPostgresClient({
      connectionString: env.DATABASE_URL,
    });
    const repo = createPostgresConfigRepo(client.db);
    const service = createConfigService({ repo });
    return {
      service,
      close: async () => {
        await client.pool.end();
      },
    };
  }

  const client: SqliteClient = createSqliteClient({ filePath: ":memory:" });
  client.connection.exec(CONFIG_KV_SQLITE_SCHEMA_SQL);
  const repo = createSqliteConfigRepo(client.db);
  const service = createConfigService({ repo });

  return {
    service,
    close: () => {
      client.connection.close();
      return Promise.resolve();
    },
  };
}
