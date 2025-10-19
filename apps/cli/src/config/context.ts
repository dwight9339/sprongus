import fs from "node:fs/promises";
import path from "node:path";

import type { ConfigService } from "@sprongus/core";
import { createConfigService } from "@sprongus/core";
import {
  CONFIG_KV_SQLITE_SCHEMA_SQL,
  createSqliteClient,
  createSqliteConfigRepo,
  type SqliteClient,
} from "@sprongus/db";

import { resolveLocalDbPath } from "./paths.js";
import { createRemoteConfigRepo } from "./remote.js";

export interface CreateContextOptions {
  dbPath?: string;
  remoteUrl?: string | null;
  fetchImpl?: typeof fetch;
}

export interface ConfigContext {
  service: ConfigService;
  mode: "local" | "remote";
  close(): Promise<void>;
}

async function ensureDirectoryFor(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function createLocalContext(dbPath?: string): Promise<ConfigContext> {
  const resolvedPath = resolveLocalDbPath(dbPath);
  await ensureDirectoryFor(resolvedPath);

  const client: SqliteClient = createSqliteClient({ filePath: resolvedPath });
  client.connection.exec(CONFIG_KV_SQLITE_SCHEMA_SQL);

  const repo = createSqliteConfigRepo(client.db);
  const service = createConfigService({ repo });

  return {
    service,
    mode: "local",
    close: () => {
      client.connection.close();
      return Promise.resolve();
    },
  };
}

function createRemoteContext(
  remoteUrl: string,
  fetchImpl?: typeof fetch,
): Promise<ConfigContext> {
  const baseUrl = remoteUrl.endsWith("/") ? remoteUrl.slice(0, -1) : remoteUrl;
  const repo = createRemoteConfigRepo(baseUrl, fetchImpl ?? fetch);
  const service = createConfigService({ repo });
  return Promise.resolve({
    service,
    mode: "remote",
    close: () => Promise.resolve(),
  });
}

export async function createConfigContext(
  options: CreateContextOptions = {},
): Promise<ConfigContext> {
  if (options.remoteUrl) {
    return createRemoteContext(options.remoteUrl, options.fetchImpl);
  }
  return createLocalContext(options.dbPath);
}
