# Config Slice

Status: Not started
Area: API, CLI, Core, DB
Docs: DB Table Schemas (https://www.notion.so/DB-Table-Schemas-262ae4aa36208003a16aeb5ef54427e6?pvs=21)

## Summary

Implement the system-level configuration slice (ConfigKV) across the stack. This enables instance-wide key/value settings (non-secret) with JSON-friendly values. Supports CRUD operations via both the CLI and API.

## Scope

- DB: Add `ConfigKV` table with per-dialect migrations (TEXT in SQLite, jsonb in Postgres later if needed).
- Core: Add typed accessors + Zod validation for config values.
- CLI: Implement `sprongus config` commands for get/set/unset/list/import/export, with `-remote` support.
- API: Expose REST endpoints under `/v1/config` for the same operations.

## To-Do (DB)

- [ ] Define `ConfigKV` schema in Drizzle (id/text key, text/json value, updatedAt).
- [ ] Generate SQLite migrations.
- [ ] Generate Postgres migrations.
- [ ] Add cross-dialect migration tests.

## To-Do (Core)

- [ ] Create `ConfigService` with methods: `get(key)`, `set(key,value)`, `unset(key)`, `list(prefix?)`, `import(items, mode)`, `export(prefix?)`.
- [ ] Add Zod schema to validate key format (`^[a-z0-9._:-]+$`) and JSON values.
- [ ] Export types + service from `core` barrel.

## To-Do (CLI)

- [ ] `sprongus config get <key>` (with `-json` flag).
- [ ] `sprongus config set <key> <value>` (supports `-json`, `-stdin`).
- [ ] `sprongus config unset <key>`.
- [ ] `sprongus config list` (with `-prefix`, `-values`, `-json`).
- [ ] `sprongus config import --file <path> [--merge|--replace]`.
- [ ] `sprongus config export [--prefix <str>] [--json]`.
- [ ] Add `-remote` flag to all commands.
- [ ] CLI unit tests for local SQLite and mock API mode.

## To-Do (API)

- [ ] `GET /v1/config` (list, supports `prefix`, `includeValues`, pagination).
- [ ] `GET /v1/config/:key`.
- [ ] `PUT /v1/config/:key` (upsert; idempotency via `Idempotency-Key` header).
- [ ] `DELETE /v1/config/:key`.
- [ ] `POST /v1/config:import` (bulk merge/replace).
- [ ] `GET /v1/config:export` (bulk export).
- [ ] Add request/response validation with Zod.
- [ ] Wire endpoints to core `ConfigService`.

## To-Do (Tests & Docs)

- [ ] Migration test: both SQLite and Postgres create/insert/query work.
- [ ] Core service unit tests (Zod rejects bad keys/values).
- [ ] CLI e2e tests: `set/get/unset/list` round-trip.
- [ ] API e2e tests: supertest for each endpoint.
- [ ] Update `db` README: system vs project config split.
- [ ] Update `cli` README: usage examples for `sprongus config`.
- [ ] Update `api` docs/OpenAPI spec.

## DoD

- [ ] ConfigKV table exists and migrates in SQLite + Postgres.
- [ ] Core `ConfigService` passes unit tests.
- [ ] CLI commands operate locally and via `-remote`.
- [ ] API endpoints return correct responses, with validation + idempotency.
- [ ] Documentation updated to reflect new system-level config support.
