# Config Slice

Status: Not started (scoping refined)
Area: API, CLI, Core, DB
Docs: DB Table Schemas (https://www.notion.so/DB-Table-Schemas-262ae4aa36208003a16aeb5ef54427e6?pvs=21)

## Summary

Implement the system-level configuration slice (ConfigKV) across the stack. This enables instance-wide key/value settings (non-secret) with JSON-friendly values. Supports CRUD operations via both the CLI and API.

Key runtime model:

- CLI uses a local SQLite database (no network required).
- API uses Postgres for multi-user/remote orchestration.

## Scope

- DB: Add `ConfigKV` table with per-dialect migrations.
  - SQLite (CLI): store values as `TEXT` containing JSON-encoded values.
  - Postgres (API): store values as `jsonb` (or `TEXT` initially if needed for speed; interface remains the same).
- Core: Add typed accessors + Zod validation for config values and keys.
- CLI: Implement `sprongus config` commands for get/set/unset/list/import/export, with `--remote` support.
- API: Expose REST endpoints under `/v1/config` for the same operations.

## Decisions

- Dialects: CLI = SQLite via `better-sqlite3`; API = Postgres via `pg`.
- Drizzle config: maintain separate migration folders per dialect (e.g., `drizzle/sqlite`, `drizzle/pg`); configure two drizzle config files or a single env-driven one.
- Key format: enforce `^[a-z0-9._:-]+$` via Zod at Core and API boundaries.
- Value format: accept any JSON-serializable value; persist as JSON text in SQLite and `jsonb` in Postgres.
- Import/Export wire format: JSON object map `{ "key": value }` for simplicity; CLI/API both use this.
- CLI JSON flag: prefer oclif’s built-in `--json` (`enableJsonFlag`) instead of a custom `-json`; allow `-j` alias if desired.
- Remote selection: `--remote <url>` overrides; default resolved from `SPRONGUS_API_URL` env or `http://localhost:3000`.
- Local DB path (CLI): default to `~/.config/sprongus/sprongus.db` (or OS-appropriate config dir); override with env `SPRONGUS_DB_PATH` or a CLI flag.
- Idempotency: `PUT /v1/config/:key` is state-idempotent; defer full `Idempotency-Key` persistence until the Runs slice introduces shared infra.

## Dependencies

- Add to workspace as appropriate:
  - `@sprongus/db`: `drizzle-orm`, `drizzle-kit`, `better-sqlite3`, `pg`.
  - `@sprongus/core`: `zod`.
  - `@sprongus/api`: `zod` (and optionally `fastify-type-provider-zod`, or manual parsing).
  - `@sprongus/cli`: depends on `@sprongus/core` and `@sprongus/db`.

## To-Do (DB)

- [x] Define `ConfigKV` schema in Drizzle (id/text key, text/json value, updatedAt).
- [x] Add Drizzle config(s) for dual dialects; output to `drizzle/sqlite` and `drizzle/pg`.
- [x] Implement `ConfigRepo` for SQLite (CLI) and Postgres (API).
- [x] Generate SQLite migrations and verify against in-memory and file-backed DBs.
- [x] Generate Postgres migrations and verify against docker-compose Postgres.
- [x] Add cross-dialect migration + CRUD tests.

## To-Do (Core)

- [ ] Create `ConfigService` with methods: `get(key)`, `set(key,value)`, `unset(key)`, `list(prefix?)`, `import(items, mode)`, `export(prefix?)`.
- [ ] Define a storage interface `ConfigRepo` to decouple Core from DB drivers.
- [ ] Add Zod schema to validate key format (`^[a-z0-9._:-]+$`) and JSON values.
- [ ] Export types + service from `core` barrel for use by CLI and API.

## To-Do (CLI)

- [ ] `sprongus config get <key>` (supports `--json`).
- [ ] `sprongus config set <key> <value>` (supports `--json`, `--stdin`).
- [ ] `sprongus config unset <key>`.
- [ ] `sprongus config list` (supports `--prefix`, `--values`, `--json`).
- [ ] `sprongus config import --file <path> [--merge|--replace]` (file format: object map `{key: value}`).
- [ ] `sprongus config export [--prefix <str>] [--json]` (object map output).
- [ ] Add `--remote` flag to all commands; default from `SPRONGUS_API_URL`.
- [ ] Default SQLite path as described; support `SPRONGUS_DB_PATH` override and a `--db` flag.
- [ ] CLI unit tests for local SQLite and mock API mode.

## To-Do (API)

- [ ] `GET /v1/config` (list, supports `prefix`, `includeValues`, pagination).
- [ ] `GET /v1/config/:key`.
- [ ] `PUT /v1/config/:key` (upsert; treat as idempotent by state; defer `Idempotency-Key`).
- [ ] `DELETE /v1/config/:key`.
- [ ] `POST /v1/config:import` (bulk merge/replace; object map input).
- [ ] `GET /v1/config:export` (bulk export; object map output).
- [ ] Add request/response validation with Zod (optional `fastify-type-provider-zod`).
- [ ] Wire endpoints to core `ConfigService` and DB-backed `ConfigRepo`.
- [ ] Initialize DB connection on boot; close on shutdown.

## To-Do (Tests & Docs)

- [ ] Migration test: both SQLite and Postgres create/insert/query work.
- [ ] Core service unit tests (Zod rejects bad keys/values; repo contract tests).
- [ ] CLI e2e tests: `set/get/unset/list` round-trip (SQLite).
- [ ] API e2e tests: Fastify inject for each endpoint.
- [ ] Update `db` README: system vs project config split; dialects and migration folders.
- [ ] Update `cli` README: usage examples for `sprongus config`; local DB path + overrides.
- [ ] Update `api` docs/OpenAPI spec; document idempotency expectations.

## DoD

- [ ] ConfigKV table exists and migrates in SQLite + Postgres.
- [ ] Core `ConfigService` passes unit tests.
- [ ] CLI commands operate locally and via `-remote`.
- [ ] API endpoints return correct responses, with validation + idempotency.
- [ ] Documentation updated to reflect new system-level config support.
