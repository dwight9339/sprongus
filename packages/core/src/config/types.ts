export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ConfigValue = JsonValue;

export interface ConfigEntry {
  id: number;
  key: string;
  value: ConfigValue;
  updatedAt: Date;
}

export interface ListConfigOptions {
  prefix?: string;
  includeValues?: boolean;
  limit?: number;
  offset?: number;
}

export type ImportMode = "merge" | "replace";

export interface ImportConfigOptions {
  mode?: ImportMode;
}

export interface ExportConfigOptions {
  prefix?: string;
}

export interface ConfigRepo {
  get(key: string): Promise<ConfigEntry | null>;
  set(key: string, value: ConfigValue): Promise<ConfigEntry>;
  unset(key: string): Promise<void>;
  list(options?: ListConfigOptions): Promise<ConfigEntry[]>;
  import(
    records: Record<string, ConfigValue>,
    options?: ImportConfigOptions,
  ): Promise<ConfigEntry[]>;
  export(options?: ExportConfigOptions): Promise<Record<string, ConfigValue>>;
}

export type ConfigRecord = Record<string, ConfigValue>;
