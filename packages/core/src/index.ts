export { CONFIG_KEY_REGEX } from "./config/shared.js";
export {
  configKeySchema,
  configRecordSchema,
  configValueSchema,
  exportOptionsSchema,
  importOptionsSchema,
  listOptionsSchema,
} from "./config/schemas.js";
export {
  createConfigService,
  type ConfigService,
  type CreateConfigServiceOptions,
} from "./config/service.js";
export type {
  ConfigEntry,
  ConfigRepo,
  ConfigRecord,
  ConfigValue,
  ExportConfigOptions,
  ImportConfigOptions,
  ImportMode,
  JsonPrimitive,
  JsonValue,
  ListConfigOptions,
} from "./config/types.js";
