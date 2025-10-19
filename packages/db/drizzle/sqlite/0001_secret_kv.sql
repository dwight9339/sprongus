CREATE TABLE IF NOT EXISTS secret_kv (
  id text PRIMARY KEY NOT NULL,
  owner_type text NOT NULL,
  owner_id text,
  key_name text NOT NULL,
  ciphertext text NOT NULL,
  dek_wrapped text NOT NULL,
  nonce text NOT NULL,
  alg text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  meta text,
  hmac text,
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_rotated_at text
);

CREATE UNIQUE INDEX IF NOT EXISTS secret_kv_scope_key_unique
  ON secret_kv (owner_type, IFNULL(owner_id, ''), key_name);

CREATE INDEX IF NOT EXISTS secret_kv_owner_scope_idx
  ON secret_kv (owner_type, IFNULL(owner_id, ''));
