import { z } from "zod";

import { CONFIG_KEY_REGEX } from "./shared.js";
import type { ConfigValue, JsonValue } from "./types.js";

export const configKeySchema = z
  .string()
  .min(1, "Config keys must be at least 1 character long")
  .regex(CONFIG_KEY_REGEX, "Invalid config key format");

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

export const configValueSchema: z.ZodType<ConfigValue> = jsonValueSchema;

export const configRecordSchema = z.record(configValueSchema);

export const listOptionsSchema = z
  .object({
    prefix: configKeySchema.optional(),
    includeValues: z.boolean().optional(),
    limit: z.number().int().min(1).optional(),
    offset: z.number().int().min(0).optional(),
  })
  .partial()
  .default({});

export const importOptionsSchema = z
  .object({
    mode: z.enum(["merge", "replace"]).optional(),
  })
  .partial()
  .default({});

export const exportOptionsSchema = z
  .object({
    prefix: configKeySchema.optional(),
  })
  .partial()
  .default({});
