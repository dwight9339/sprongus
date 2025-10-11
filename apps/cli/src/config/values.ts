import type { ConfigValue } from "@sprongus/core";

export function parseValueInput(raw: string): ConfigValue {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return "";
  }

  const lower = trimmed.toLowerCase();
  if (lower === "null") return null;
  if (lower === "true") return true;
  if (lower === "false") return false;

  if (!Number.isNaN(Number(trimmed)) && trimmed.length <= 32) {
    const num = Number(trimmed);
    if (!Number.isNaN(num)) {
      return num;
    }
  }

  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  const likelyJson =
    first === "{" ||
    first === "[" ||
    (first === '"' && last === '"') ||
    (first === "'" && last === "'");

  if (likelyJson) {
    try {
      const normalized =
        first === "'" && last === "'"
          ? `"${trimmed.slice(1, -1).replaceAll('"', '\\"')}"`
          : trimmed;
      return JSON.parse(normalized) as ConfigValue;
    } catch {
      // fall through to treat as string
    }
  }

  return trimmed;
}
