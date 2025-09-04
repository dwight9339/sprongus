import type { ApiEnv } from "./env.js";

declare module "fastify" {
  interface FastifyInstance {
    config: ApiEnv;
  }
}
