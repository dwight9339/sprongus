export const CONFIG_KV_SQLITE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS config_kv (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS config_kv_key_unique ON config_kv (key);
`;
