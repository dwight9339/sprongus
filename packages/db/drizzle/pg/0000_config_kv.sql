CREATE TABLE "config_kv" (
  "id" serial PRIMARY KEY,
  "key" text NOT NULL,
  "value" jsonb NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "config_kv_key_unique" ON "config_kv" ("key");
