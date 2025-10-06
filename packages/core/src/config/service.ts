import type { z } from "zod";

import {
  configKeySchema,
  configRecordSchema,
  configValueSchema,
  exportOptionsSchema,
  importOptionsSchema,
  listOptionsSchema,
} from "./schemas.js";
import type {
  ConfigEntry,
  ConfigRepo,
  ConfigValue,
  ExportConfigOptions,
  ImportConfigOptions,
  ListConfigOptions,
  ConfigRecord,
} from "./types.js";

export interface ConfigService {
  get(key: string): Promise<ConfigEntry | null>;
  set(key: string, value: ConfigValue): Promise<ConfigEntry>;
  unset(key: string): Promise<void>;
  list(options?: ListConfigOptions): Promise<ConfigEntry[]>;
  import(
    records: ConfigRecord,
    options?: ImportConfigOptions,
  ): Promise<ConfigEntry[]>;
  export(options?: ExportConfigOptions): Promise<Record<string, ConfigValue>>;
}

export interface CreateConfigServiceOptions {
  repo: ConfigRepo;
}

export function createConfigService(
  options: CreateConfigServiceOptions,
): ConfigService {
  const { repo } = options;

  const sanitizeListOptions = (
    value: z.infer<typeof listOptionsSchema>,
  ): ListConfigOptions => {
    const result: ListConfigOptions = {};
    if (value.prefix !== undefined) {
      result.prefix = value.prefix;
    }
    if (value.includeValues !== undefined) {
      result.includeValues = value.includeValues;
    }
    if (value.limit !== undefined) {
      result.limit = value.limit;
    }
    if (value.offset !== undefined) {
      result.offset = value.offset;
    }
    return result;
  };

  const sanitizeImportOptions = (
    value: z.infer<typeof importOptionsSchema>,
  ): ImportConfigOptions => {
    const result: ImportConfigOptions = {};
    if (value.mode !== undefined) {
      result.mode = value.mode;
    }
    return result;
  };

  const sanitizeExportOptions = (
    value: z.infer<typeof exportOptionsSchema>,
  ): ExportConfigOptions => {
    const result: ExportConfigOptions = {};
    if (value.prefix !== undefined) {
      result.prefix = value.prefix;
    }
    return result;
  };

  return {
    async get(key) {
      const validatedKey = configKeySchema.parse(key);
      return repo.get(validatedKey);
    },

    async set(key, value) {
      const validatedKey = configKeySchema.parse(key);
      const validatedValue = configValueSchema.parse(value);
      return repo.set(validatedKey, validatedValue);
    },

    async unset(key) {
      const validatedKey = configKeySchema.parse(key);
      await repo.unset(validatedKey);
    },

    async list(options) {
      const validatedOptions = listOptionsSchema.parse(options ?? {});
      return repo.list(sanitizeListOptions(validatedOptions));
    },

    async import(records, options) {
      const validatedRecords = configRecordSchema.parse(records);
      const validatedOptions = importOptionsSchema.parse(options ?? {});
      return repo.import(
        validatedRecords,
        sanitizeImportOptions(validatedOptions),
      );
    },

    async export(options) {
      const validatedOptions = exportOptionsSchema.parse(options ?? {});
      return repo.export(sanitizeExportOptions(validatedOptions));
    },
  };
}
