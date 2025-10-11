import type { ApiEnv } from "./env.js";
import type { ConfigService } from "@sprongus/core";

declare module "fastify" {
  interface FastifyInstance {
    config: ApiEnv;
    configService: ConfigService;
  }
}
