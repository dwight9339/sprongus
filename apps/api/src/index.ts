import Fastify from "fastify";
import { pathToFileURL } from "url";

export function buildServer() {
  const app = Fastify({ logger: true });

  app.get("/health", () => ({ ok: true }));

  return app;
}

async function start() {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? "0.0.0.0";
  try {
    await app.listen({ port, host });
    app.log.info(`API listening on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Only start if executed directly (not when imported)
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void start();
}
