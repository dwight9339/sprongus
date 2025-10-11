import type {
  ConfigEntry,
  ConfigRepo,
  ConfigRecord,
  ConfigValue,
  ExportConfigOptions,
  ImportConfigOptions,
  ListConfigOptions,
} from "@sprongus/core";

type FetchFn = typeof fetch;

function buildUrl(baseUrl: string, pathname: string, params?: URLSearchParams) {
  const url = new URL(pathname, baseUrl);
  if (params) {
    url.search = params.toString();
  }
  return url;
}

async function requestJson<T>(
  fetchImpl: FetchFn,
  input: URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetchImpl(input, {
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Remote request failed (${response.status} ${response.statusText}): ${text}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json()) as unknown;
  return data as T;
}

interface RemoteConfigPayload {
  id: number;
  key: string;
  value: ConfigValue;
  updatedAt: string;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is ConfigValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  if (isPlainRecord(value)) {
    return Object.values(value).every(isJsonValue);
  }
  return false;
}

function assertRemoteConfigPayload(value: unknown): RemoteConfigPayload {
  if (!isPlainRecord(value)) {
    throw new Error("Remote config payload must be an object");
  }
  const { id, key, value: rawValue, updatedAt } = value;
  if (typeof id !== "number") {
    throw new Error("Remote config payload missing numeric id");
  }
  if (typeof key !== "string") {
    throw new Error("Remote config payload missing string key");
  }
  if (typeof updatedAt !== "string") {
    throw new Error("Remote config payload missing string updatedAt");
  }
  if (!isJsonValue(rawValue)) {
    throw new Error("Remote config payload value must be JSON serializable");
  }
  return {
    id,
    key,
    value: rawValue,
    updatedAt,
  };
}

function assertConfigRecord(value: unknown): ConfigRecord {
  if (!isPlainRecord(value)) {
    throw new Error("Remote config export must be an object map");
  }
  for (const entry of Object.values(value)) {
    if (!isJsonValue(entry)) {
      throw new Error("Remote config export values must be JSON serializable");
    }
  }
  return value as ConfigRecord;
}

function parseEntry(payload: unknown): ConfigEntry {
  const data = assertRemoteConfigPayload(payload);
  const timestamp = new Date(data.updatedAt);
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("Remote config payload has invalid updatedAt");
  }
  return {
    id: data.id,
    key: data.key,
    value: data.value,
    updatedAt: timestamp,
  };
}

export function createRemoteConfigRepo(
  baseUrl: string,
  fetchImpl: FetchFn,
): ConfigRepo {
  return {
    async get(key) {
      const url = buildUrl(baseUrl, `/v1/config/${encodeURIComponent(key)}`);
      const response = await fetchImpl(url);
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `Remote request failed (${response.status} ${response.statusText}): ${text}`,
        );
      }
      const payload = (await response.json()) as unknown;
      return parseEntry(payload);
    },

    async set(key, value) {
      const url = buildUrl(baseUrl, `/v1/config/${encodeURIComponent(key)}`);
      const data = await requestJson<RemoteConfigPayload>(fetchImpl, url, {
        method: "PUT",
        body: JSON.stringify({ value }),
      });
      return parseEntry(data);
    },

    async unset(key) {
      const url = buildUrl(baseUrl, `/v1/config/${encodeURIComponent(key)}`);
      const response = await fetchImpl(url, { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `Remote request failed (${response.status} ${response.statusText}): ${text}`,
        );
      }
    },

    async list(options: ListConfigOptions = {}) {
      const params = new URLSearchParams();
      if (options.prefix) params.set("prefix", options.prefix);
      if (typeof options.limit === "number")
        params.set("limit", `${options.limit}`);
      if (typeof options.offset === "number")
        params.set("offset", `${options.offset}`);
      if (options.includeValues) params.set("includeValues", "true");
      const url = buildUrl(baseUrl, "/v1/config", params);
      const data = await requestJson<RemoteConfigPayload[]>(fetchImpl, url);
      return data.map(parseEntry);
    },

    async import(records: ConfigRecord, options: ImportConfigOptions = {}) {
      const url = buildUrl(baseUrl, "/v1/config:import");
      const data = await requestJson<RemoteConfigPayload[]>(fetchImpl, url, {
        method: "POST",
        body: JSON.stringify({ data: records, mode: options.mode ?? "merge" }),
      });
      return data.map(parseEntry);
    },

    async export(options: ExportConfigOptions = {}) {
      const params = new URLSearchParams();
      if (options.prefix) params.set("prefix", options.prefix);
      const url = buildUrl(baseUrl, "/v1/config:export", params);
      const payload = await requestJson<unknown>(fetchImpl, url);
      return assertConfigRecord(payload);
    },
  };
}
