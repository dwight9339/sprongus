# Secrets Slice

Status: Not started
Area: API, CLI, Core, DB
Docs: DB Table Schemas (https://www.notion.so/DB-Table-Schemas-262ae4aa36208003a16aeb5ef54427e6?pvs=21)

## Summary

Implement a system-wide secure secrets store (SecretKV) used by both CLI and API. Values are encrypted at rest via envelope encryption and scoped to user, project, or system. CRUD flows exist, but reads are tightly controlled (masked by default, optional one-time reveal).

## Scope

- DB: Add `SecretKV` with per-dialect migrations (SQLite + Postgres). Encrypt values before persistence.
- Core: Provide `SecretsService` with encryption, validation, scoping, rotation, and audit hooks.
- CLI: Add `sprongus secrets` commands (set/get/unset/list/import) with safe output and `remote` support; prefer OS keychain where available.
- API: Expose `/v1/secrets` endpoints with strict auth scopes, masking-by-default, and one-time reveal tokens.

## Threat Model & Design Choices

- At-rest encryption: XChaCha20-Poly1305 (libsodium) or AES-GCM via a wrapped data key.
- Envelope encryption:
  - **Master key** from cloud KMS (prod) / dotenv (dev) / OS keychain (CLI local).
  - Per-secret **Data Encryption Key (DEK)** randomly generated; DEK is encrypted (“wrapped”) with the master and stored alongside ciphertext.
- Minimization: never log plaintext; redact responses by default; require explicit `-reveal` or header to view once.
- Scoping: each secret is owned by `{ownerType: "user"|"project"|"system", ownerId}` and a `keyName`.
- Optional integrity check: store HMAC(plaintext) with a separate HMAC key (rotatable) to detect accidental changes without decryption.

## To-Do (DB)

- [ ] Define `SecretKV` schema:
- `id` (text PK), `ownerType` (text), `ownerId` (text|null), `keyName` (text),
  `ciphertext` (bytea/text base64), `dekWrapped` (bytea/text),
  `nonce` (bytea/text), `alg` (text), `version` (int),
  `createdAt`, `updatedAt`, `lastRotatedAt` (timestamps),
  `meta` (TEXT in SQLite / JSONB in Postgres), `hmac` (optional text).
- [ ] Indexes: unique `(ownerType, ownerId, keyName)`, plus `ownerType, ownerId`.
- [ ] Postgres: enable RLS policies for tenant isolation; grant by role.
- [ ] Generate SQLite + Postgres migrations.
- [ ] Add cross-dialect migration tests.

## To-Do (Core)

- [ ] `SecretsService` API:
- `set({scope, keyName, value, meta?})` → writes encrypted
- `get({scope, keyName, reveal?: boolean})` → masked by default; plaintext only with `reveal`
- `unset({scope, keyName})`
- `list({scope, prefix?, withMeta?})` → never returns plaintext
- `import(list, mode)` (values may be plaintext or already-encrypted bundle)
- `export({scope, prefix?, encryptedBundle?: boolean})` (default: metadata-only)
- `rotate({scope, keyName})` (re-encrypt with new DEK; supports bulk)
- [ ] Key management utilities:
- Master key providers: KMS | env | OS keychain; pluggable interface.
- DEK generation/wrapping; algorithm tagging and versioning.
- [ ] Validation (Zod):
- `keyName` format like ConfigKV.
- `scope` shape.
- `meta` JSON shape (e.g., tags like `provider=notion`).
- [ ] Redaction helpers for logging and API DTOs.
- [ ] Optional HMAC integrity check helpers.

## To-Do (CLI)

- [ ] `sprongus secrets set <scope> <key> <value>` (supports `stdin`, `file`, `json`)
- [ ] `sprongus secrets get <scope> <key>` (masked by default; `-reveal` prompts confirmation)
- [ ] `sprongus secrets unset <scope> <key>`
- [ ] `sprongus secrets list <scope>` (`prefix`, `meta`, never prints values)
- [ ] `sprongus secrets import --file <path> [--merge|--replace]`
- [ ] `sprongus secrets export <scope> [--prefix] [--bundle]` (bundle = encrypted, safe to move)
- [ ] `-remote` flag parity with ConfigKV
- [ ] Prefer OS keychain (Keytar) locally; fallback to SQLite vault (still encrypted)
- [ ] Unit tests incl. reveal prompts and piping via stdin

## To-Do (API)

- [ ] Endpoints under `/v1/secrets` with auth scopes (`secrets:read`, `secrets:write`):
- `GET /v1/secrets` → list (masked), filter by scope/prefix, paginate
- `GET /v1/secrets/:ownerType/:ownerId/:keyName` → masked by default
- `POST /v1/secrets/:ownerType/:ownerId/:keyName:reveal` → returns plaintext once; audit
- `PUT /v1/secrets/:ownerType/:ownerId/:keyName` → upsert (Idempotency-Key)
- `DELETE /v1/secrets/:ownerType/:ownerId/:keyName`
- `POST /v1/secrets:import` / `GET /v1/secrets:export` (bundle mode)
- [ ] Response DTOs always redact values unless reveal endpoint used.
- [ ] Zod request/response validation.
- [ ] Rate-limit reveal and write endpoints; require recent auth (re-auth or 2FA-ready hook).
- [ ] Emit audit events for create/update/reveal/delete.

## Security & Ops

- [ ] KMS config in prod; environment master key only for dev/test.
- [ ] Rotation:
- Support master key rotation (re-wrap all DEKs).
- Support per-secret rotation (new DEK; re-encrypt).
- [ ] Secrets masking in logs (`**`), traces, and error messages.
- [ ] Disallow plaintext in `import` without `-allow-plaintext` flag.
- [ ] Backups: ensure ciphertext + wrapped DEK are sufficient to restore (master key must exist in KMS history).
- [ ] Optional: checksum column to detect drift/bitrot.

## Tests & Docs

- [ ] Crypto unit tests (nonce uniqueness, round-trip, tamper detection).
- [ ] RLS tests (Postgres): user/project isolation.
- [ ] CLI e2e: set/get (masked), reveal flow with confirmation, import/export bundle.
- [ ] API e2e (supertest): all endpoints, idempotency, rate limit behavior.
- [ ] Load tests on list/reveal to verify rate limiting and masking.
- [ ] Docs:
- Explain scopes and key naming.
- Security model (envelope encryption, masking, reveal).
- Recovery/rotation procedures.
- Example provider secrets (Notion/GDocs) and recommended keys.

## DoD

- [ ] `SecretKV` migrates on SQLite + Postgres; unique (ownerType, ownerId, keyName) enforced.
- [ ] `SecretsService` passes crypto and behavior tests; redaction works globally.
- [ ] CLI commands work locally (OS keychain preferred) and with `remote`.
- [ ] API endpoints enforce scopes, mask by default, and support one-time reveal.
- [ ] Audit logs recorded for secret write/reveal/delete.
- [ ] Docs updated with security model, rotation, and usage.
