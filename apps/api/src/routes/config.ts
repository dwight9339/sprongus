import type { FastifyPluginAsync, FastifyReply } from "fastify";
import type {
  ConfigEntry,
  ConfigRecord,
  ConfigValue,
  ImportMode,
  ListConfigOptions,
} from "@sprongus/core";
import { ZodError } from "zod";

interface ConfigListQuery {
  prefix?: string;
  limit?: string;
  offset?: string;
  includeValues?: string | boolean;
}

interface ConfigParams {
  key: string;
}

interface ConfigSetBody {
  value: ConfigValue;
}

interface ConfigImportBody {
  data: Record<string, ConfigValue>;
  mode?: ImportMode;
}

interface ConfigExportQuery {
  prefix?: string;
}

function toBoolean(value: string | boolean | undefined): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return undefined;
}

function parseInteger(
  value: string | undefined,
  field: "limit" | "offset",
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(
      `Query parameter "${field}" must be a non-negative integer`,
    );
  }
  return parsed;
}

function serializeEntry(entry: ConfigEntry) {
  return {
    id: entry.id,
    key: entry.key,
    value: entry.value,
    updatedAt: entry.updatedAt.toISOString(),
  };
}

function isConfigRecord(value: unknown): value is ConfigRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function handleConfigError(reply: FastifyReply, error: unknown): boolean {
  if (error instanceof ZodError) {
    void reply.status(400).send({
      error: "BadRequest",
      message: "Invalid config payload",
      issues: error.issues,
    });
    return true;
  }
  return false;
}

export const configRoutes: FastifyPluginAsync = (fastify) => {
  fastify.get<{ Querystring: ConfigListQuery }>(
    "/config",
    async (request, reply) => {
      try {
        const { prefix } = request.query;
        const limit = parseInteger(request.query.limit, "limit");
        const offset = parseInteger(request.query.offset, "offset");
        const includeValues = toBoolean(request.query.includeValues);

        const options: ListConfigOptions = {};
        if (prefix !== undefined) options.prefix = prefix;
        if (limit !== undefined) options.limit = limit;
        if (offset !== undefined) options.offset = offset;
        if (includeValues !== undefined) options.includeValues = includeValues;

        const entries = await fastify.configService.list(options);
        return entries.map(serializeEntry);
      } catch (error) {
        return reply.status(400).send({
          error: "BadRequest",
          message: (error as Error).message,
        });
      }
    },
  );

  fastify.get<{ Params: ConfigParams }>(
    "/config/:key",
    async (request, reply) => {
      const { key } = request.params;
      try {
        const entry = await fastify.configService.get(key);
        if (!entry) {
          return reply.status(404).send({
            error: "NotFound",
            message: `Config key "${key}" was not found`,
          });
        }
        return serializeEntry(entry);
      } catch (error) {
        if (handleConfigError(reply, error)) {
          return;
        }
        throw error;
      }
    },
  );

  fastify.put<{ Params: ConfigParams; Body: ConfigSetBody }>(
    "/config/:key",
    async (request, reply) => {
      const { key } = request.params;
      try {
        const entry = await fastify.configService.set(key, request.body.value);
        return serializeEntry(entry);
      } catch (error) {
        if (handleConfigError(reply, error)) {
          return;
        }
        throw error;
      }
    },
  );

  fastify.delete<{ Params: ConfigParams }>(
    "/config/:key",
    async (request, reply) => {
      const { key } = request.params;
      try {
        await fastify.configService.unset(key);
        reply.status(204);
        return reply.send();
      } catch (error) {
        if (handleConfigError(reply, error)) {
          return;
        }
        throw error;
      }
    },
  );

  fastify.post<{ Body: ConfigImportBody }>(
    "/config:import",
    async (request, reply) => {
      const { data, mode } = request.body;
      if (!isConfigRecord(data)) {
        return reply.status(400).send({
          error: "BadRequest",
          message: "Import payload must include a data object",
        });
      }
      try {
        const importOptions = mode !== undefined ? { mode } : undefined;
        const entries = await fastify.configService.import(data, importOptions);
        return entries.map(serializeEntry);
      } catch (error) {
        if (handleConfigError(reply, error)) {
          return;
        }
        throw error;
      }
    },
  );

  fastify.get<{ Querystring: ConfigExportQuery }>(
    "/config:export",
    async (request, reply) => {
      const { prefix } = request.query;
      try {
        const record = await fastify.configService.export(
          prefix ? { prefix } : undefined,
        );
        return record;
      } catch (error) {
        if (handleConfigError(reply, error)) {
          return;
        }
        throw error;
      }
    },
  );

  return Promise.resolve();
};

export default configRoutes;
