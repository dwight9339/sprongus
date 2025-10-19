CREATE TABLE `config_kv` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `key` text NOT NULL UNIQUE,
  `value` text NOT NULL,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
