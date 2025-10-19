CREATE TABLE IF NOT EXISTS secret_kv (
  id text PRIMARY KEY,
  owner_type text NOT NULL,
  owner_id text,
  key_name text NOT NULL,
  ciphertext text NOT NULL,
  dek_wrapped text NOT NULL,
  nonce text NOT NULL,
  alg text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  meta jsonb,
  hmac text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_rotated_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS secret_kv_scope_key_unique
  ON secret_kv (owner_type, COALESCE(owner_id, ''), key_name);

CREATE INDEX IF NOT EXISTS secret_kv_owner_scope_idx
  ON secret_kv (owner_type, COALESCE(owner_id, ''));
