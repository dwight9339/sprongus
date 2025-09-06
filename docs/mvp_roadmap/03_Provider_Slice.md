# Provider Slice

Status: Not started
Area: API, CLI, Core, DB

## Summary

Add a `ProviderProfile` slice that captures non-sensitive connection details for any provider (Notion, Obsidian, Google Docs, etc.). All secrets (API keys, OAuth refresh tokens, private keys) live in `SecretKV`. Profiles reference secrets by stable names so you can rotate or swap credentials without editing the profile document.

Runtime model:

- CLI: local SQLite database for provider/profile management.
- API: Postgres database; same behaviors exposed via HTTP.

- More info
  ## Model & Storage Strategy
  ### Design principles
  - **No plaintext secrets** in `ProviderProfile` (ever).
  - **Stable references**: a profile points to secrets by `keyName` (and optional explicit `secretId`) so rotation is painless.
  - **Scope-aware**: profiles are owned by `system` or `user` (future `org`), matching the `SecretKV` scoping.
  - **JSON-friendly config**: provider-specific, non-secret config (workspace IDs, vault paths) in a JSON column.
  ### Tables
  1. ProviderProfile
  - `id` (text PK)
  - `provider` (text; e.g. `"notion" | "obsidian" | "gdocs" | "github_md" | ...`)
  - `name` (text) — human label (e.g. “Team Notion”, “My Vault”)
  - `ownerType` (text: `"system" | "user" | "org?"`)
  - `ownerId` (text | null)
  - `config` (TEXT in SQLite, JSONB in Postgres) — non-secret provider config
  - `createdAt`, `updatedAt` (ISO string timestamps)
  - Indexes:
    - unique `(ownerType, ownerId, provider, name)`
    - search index on `(provider, ownerType, ownerId)`
  1. ProviderSecretLink (recommended over storing `secretRefs` as JSON array)
  - `id` (text PK)
  - `profileId` (FK → [ProviderProfile.id](http://providerprofile.id/), cascade delete)
  - `keyName` (text) — stable secret key name (e.g., `providers/notion/api_token`, `providers/gdocs/refresh_token`)
  - `secretId` (text | null) — optional explicit link to `SecretKV.id` (helpful when migrating/locking)
  - `usage` (text | null) — optional hint (e.g., `oauth_client`, `refresh_token`, `api_key`)
  - `createdAt`, `updatedAt`
  - Constraints:
    - unique `(profileId, keyName)`
  - Rationale:
    - Easier server-side joins, validation, and auditing than a JSON array.
    - Lets you attach metadata (usage) and track rotation per link.
      > If you really want the single-table approach, keep your secretRefs JSON but be sure to validate on write and denormalize into memory for lookups. The link table scales and audits better.
  ### Secrets location & naming
  - Secrets live in `SecretKV` and are scoped to the same `(ownerType, ownerId)` as the profile.
  - Use descriptive, namespaced `keyName`s:
    - `providers/notion/api_token`
    - `providers/gdocs/refresh_token`
    - `providers/gdocs/client_secret` (system-level)
    - `providers/obsidian/signing_key`
  - Rotation story:
    - Keep `keyName` stable; rotate the underlying secret (new ciphertext) in place.
    - If you change the secret’s physical record (`secretId`), update the `ProviderSecretLink.secretId` but keep the profile untouched.
  ## Behavior & Lifecycle
  - **Create profile**: write `ProviderProfile` (non-secret config), then attach one or more `ProviderSecretLink` rows pointing to existing `SecretKV` items (or create the secrets first).
  - **Read profile**: API/CLI returns profile + list of `keyName`s (masked, no values).
  - **Use profile**:
    1. Resolve links → fetch secrets via `SecretsService.get({scope, keyName})`.
    2. Compose provider client config: `config` + decrypted secrets (in memory only).
  - **Rotate secret**:
    - Rotate in `SecretKV` (re-wrap/re-encrypt); `keyName` unchanged → no profile change.
    - If you must change record identity, keep `keyName` stable and update `ProviderSecretLink.secretId`.
  - **Delete profile**:
    - Cascade delete `ProviderSecretLink` rows.
    - Optionally keep secrets (safer default). Provide `-with-secrets` flag to also delete linked secrets.
  ## API & CLI
  ### CLI (`sprongus provider`)
  - `create <name> --provider <id> --owner <system|user> --config-file <json>`
  - `add-secret <profile> <keyName> --from-secret <id>|--set` (piped stdin supported)
  - `rm-secret <profile> <keyName>`
  - `list [--provider <id>] [--owner ...]` (shows masked secret refs)
  - `show <profile>` (dump config + keyNames; never prints values)
  - `update <profile> --config-file <json>`
  - All commands support `--remote` to hit the API (default from `SPRONGUS_API_URL` or `http://localhost:3000`).
  ### API (`/v1/providers`)
  - `POST /v1/providers` → create profile (validates provider id, config shape)
  - `GET /v1/providers` → list (filters: provider, owner, name)
  - `GET /v1/providers/:id` → returns profile + secret `keyName`s (masked)
  - `PUT /v1/providers/:id` → update config/name
  - `DELETE /v1/providers/:id` → delete (cascade links; secrets not deleted by default)
  - `POST /v1/providers/:id/secrets` → attach link `{ keyName, secretId? , usage? }`
  - `DELETE /v1/providers/:id/secrets/:keyName` → detach
  - Never expose secret values on these endpoints—use the dedicated Secrets reveal flow if absolutely needed.
  ## Validation & Security
  - Zod schemas:
    - `provider` enum
    - `name` length/charset
    - `config` schema per provider id (e.g., Notion needs `databaseId` or `pageId`; Obsidian needs `vaultPath`)
    - `keyName` regex (same as ConfigKV): `^[a-z0-9._:/-]+$`
  - Enforce `(ownerType, ownerId)` consistency between `ProviderProfile` and all linked `SecretKV` entries.
  - Postgres RLS (cloud):
    - `USING ownerType/ownerId` to isolate tenant data.
  - Masking:
    - All list/show responses return secret _references only_, never values.
  - Auditing:
    - Log create/update/delete of profiles and link attach/detach (no secret material).
  ## Per-dialect migrations (Drizzle)
  - SQLite:
    - `ProviderProfile.config` as TEXT (JSON string).
    - `ProviderSecretLink` uses TEXT columns.
  - Postgres:
    - `ProviderProfile.config` as JSONB (indexable).
    - Add partial indexes as needed (e.g., `provider` + `ownerType`).
    - RLS policies for multi-tenant hygiene.
  ## OAuth-specific notes (GDocs, GitHub, etc.)
  - Store **client credentials** (client_id, client_secret) as **system-scoped** secrets (shared by all users).
  - Store **user grants** (refresh tokens) as **user-scoped** secrets with `keyName` namespaced by provider and profile.
  - `ProviderProfile.config` can store non-secret OAuth metadata (redirect URIs, scope lists) but never tokens.
  - If you build a web callback, keep the final refresh token only in `SecretKV`; resolve it at run time via the profile’s links.
  ## Tests & Docs
  - Migration tests on both dialects.
  - Validation tests: disallow cross-scope secret links; enforce regexes; per-provider config schemas.
  - CLI e2e: create → add-secret → show → rotate secret (no profile change) → detach → delete.
  - API e2e (supertest): full CRUD + attach/detach; ensure masking and RLS.
  - Docs:
    - “How to add a Notion profile” (step-by-step with required config keys, which secrets to create).
    - “Rotation playbook” and “Deleting profiles without deleting secrets.”

## To-Do (DB)

- [ ] Define `ProviderProfile` table (id, provider, name, ownerType, ownerId, config, createdAt, updatedAt)
- [ ] Define `ProviderSecretLink` table (id, profileId, keyName, secretId?, usage?, createdAt, updatedAt)
- [ ] Add unique indexes: ProviderProfile(ownerType, ownerId, provider, name) and ProviderSecretLink(profileId, keyName)
- [ ] Generate SQLite migrations (TEXT for config)
- [ ] Generate Postgres migrations (JSONB for config) + optional GIN index on config
- [ ] (Cloud) Add Postgres RLS policies keyed by ownerType/ownerId
- [ ] Cross-dialect migration tests (create/insert/query/unique/foreign key)

## To-Do (Core)

- [ ] Zod schemas:
  - [ ] ProviderProfile input/update DTO
  - [ ] Provider-specific `config` validation (notion/obsidian/gdocs)
  - [ ] ProviderSecretLink DTO with `keyName` regex
- [ ] Implement `ProviderProfilesService`:
  - [ ] `create(profile)`
  - [ ] `update(id, patch)`
  - [ ] `remove(id, { deleteSecrets?: boolean })`
  - [ ] `list(filters)`
  - [ ] `get(id)`
  - [ ] `attachSecret(profileId, { keyName, secretId?, usage? })`
  - [ ] `detachSecret(profileId, keyName)`
  - [ ] `resolveSecrets(profileId)` → returns `{ keyName, value }[]` (in-memory only)
- [ ] Enforce scope consistency between profile and linked secrets
- [ ] Events/audit hooks: created/updated/deleted/secret-attached/secret-detached

## To-Do (CLI)

- [ ] `sprongus provider create <name> --provider <id> --owner <system|user> --config-file <json>`
- [ ] `sprongus provider update <profile> --config-file <json>`
- [ ] `sprongus provider list [--provider <id>] [--owner ...]`
- [ ] `sprongus provider show <profile>` (never prints secret values)
- [ ] `sprongus provider add-secret <profile> <keyName> [--from-secret <id>|--set|--stdin]`
- [ ] `sprongus provider rm-secret <profile> <keyName>`
- [ ] `sprongus provider delete <profile> [--with-secrets]`
- [ ] `-remote` flag parity; output masking; confirmation prompts for destructive ops
- [ ] CLI unit/e2e tests (local SQLite + mock API)

## To-Do (API)

- [ ] Routes under `/v1/providers`:
  - [ ] `POST /v1/providers` (create)
  - [ ] `GET /v1/providers` (list + filters)
  - [ ] `GET /v1/providers/:id` (profile + secret keyNames masked)
  - [ ] `PUT /v1/providers/:id` (update)
  - [ ] `DELETE /v1/providers/:id` (cascade links; secrets optional)
  - [ ] `POST /v1/providers/:id/secrets` (attach link)
  - [ ] `DELETE /v1/providers/:id/secrets/:keyName` (detach)
- [ ] Zod validation on requests/responses; error normalization
- [ ] Auth scopes: `providers:read`, `providers:write`; enforce scope-owner alignment
- [ ] Rate-limit mutating endpoints; idempotency for `POST/PUT` via `Idempotency-Key`
- [ ] Audit events emitted on create/update/delete/attach/detach

## To-Do (Security & Ops)

- [ ] Ensure secrets are **never** serialized in responses/logs/traces
- [ ] Validate `keyName` with shared regex and reserved namespaces (`providers/<id>/...`)
- [ ] Add policy to prevent linking secrets across different owners
- [ ] Add rotation playbook: rotating linked secrets doesn’t require profile edits
- [ ] Backup/restore doc: profiles + links are portable; secrets live in `SecretKV`

## To-Do (Docs)

- [ ] ProviderProfile README: model, scopes, config vs. secrets, lifecycle
- [ ] Provider-specific config guides (Notion, Obsidian, GDocs) with required keys
- [ ] CLI examples for create/list/show/add-secret/rm-secret/delete
- [ ] API docs/OpenAPI for all endpoints, including masking behavior
- [ ] “Rotation & Migration” guide (moving profiles between environments)

## DoD

- [ ] Migrations apply on SQLite and Postgres; indexes and FKs verified
- [ ] Profiles CRUD works via CLI (local) and API (remote)
- [ ] Secret links attach/detach correctly; secret values are resolved **only** in-memory at use time
- [ ] No plaintext secrets leak in logs, errors, or API responses
- [ ] RLS (pg) and validation block cross-tenant access and cross-scope secret links
- [ ] Docs and examples updated; e2e tests green for both local and remote flows
