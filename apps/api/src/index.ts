import Fastify from "fastify";
import { pathToFileURL } from "url";
import type { ConfigService } from "@sprongus/core";

import { getEnv, type ApiEnv } from "./env.js";
import { createConfigResources } from "./config/configService.js";
import { configRoutes } from "./routes/config.js";

export interface BuildServerOptions {
  configService?: ConfigService;
  configClose?: () => Promise<void>;
  env?: ApiEnv;
}

export function buildServer(options: BuildServerOptions = {}) {
  const app = Fastify({ logger: true });
  const env = options.env ?? getEnv();

  // Expose env on instance for future plugins/routes
  app.decorate("config", env);

  let configService: ConfigService;
  let closeConfig: () => Promise<void> = () => Promise.resolve();

  if (options.configService) {
    configService = options.configService;
    if (typeof options.configClose === "function") {
      closeConfig = () => options.configClose!();
    }
  } else {
    const isTestEnv = process.env.NODE_ENV === "test";
    const hasDatabaseUrl = Boolean(env.DATABASE_URL);
    const resourcesEnv =
      hasDatabaseUrl && !isTestEnv
        ? env
        : {
            ...env,
            DATABASE_URL: undefined,
          };
    const resources = createConfigResources(resourcesEnv);
    configService = resources.service;
    closeConfig = () => resources.close();
    if (!hasDatabaseUrl) {
      app.log.warn(
        "DATABASE_URL not set; using in-memory SQLite config store (for development/testing only).",
      );
    } else if (hasDatabaseUrl && isTestEnv) {
      app.log.info(
        "NODE_ENV=test detected; using in-memory SQLite config store instead of DATABASE_URL for isolated tests.",
      );
    }
  }

  app.decorate("configService", configService);

  app.addHook("onClose", async () => {
    await closeConfig();
  });

  app.register(configRoutes, { prefix: "/v1" });

  app.get("/health", () => ({ ok: true }));

  return app;
}

async function start() {
  const app = buildServer();
  const { PORT: port, HOST: host } = app.config;
  try {
    await app.listen({ port, host });
    app.log.info(`API listening on http://${host}:${port}`);
    // Log presence (not values) of external services for visibility during boot
    const cfg = app.config;
    app.log.info(
      {
        hasDatabase: Boolean(cfg.DATABASE_URL),
        hasRedis: Boolean(cfg.REDIS_URL),
        hasS3: Boolean(cfg.S3_ENDPOINT && cfg.S3_BUCKET),
      },
      "External service env detected",
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Only start if executed directly (not when imported)
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void start();
}
