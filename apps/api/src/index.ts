import Fastify from "fastify";
import { pathToFileURL } from "url";
import { getEnv } from "./env.js";

export function buildServer() {
  const app = Fastify({ logger: true });
  const env = getEnv();

  // Expose env on instance for future plugins/routes
  app.decorate("config", env);

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
