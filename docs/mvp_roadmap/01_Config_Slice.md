# Config Slice

Status: In progress (DB/Core/CLI landed; API pending)
Area: API, CLI, Core, DB
Docs: DB Table Schemas (https://www.notion.so/DB-Table-Schemas-262ae4aa36208003a16aeb5ef54427e6?pvs=21)

## Summary

Implement the system-level configuration slice (ConfigKV) across the stack. This enables instance-wide key/value settings (non-secret) with JSON-friendly values. Supports CRUD operations via both the CLI and API.

Key runtime model:

- CLI uses a local SQLite database (no network required).
- API uses Postgres for multi-user/remote orchestration.

## Current Status

- DB: `packages/db` exposes `ConfigKV` schema, SQLite/Postgres repos, and migrations under `packages/db/drizzle/{sqlite,pg}` with dialect-specific CRUD tests.
- Core: `packages/core/src/config` ships `ConfigService`, Zod schemas, and contract tests (`service.test.ts`).
- CLI: `apps/cli/src/commands/config` implements get/set/unset/list/import/export with JSON/default-path handling, remote delegation (`--remote` flag), and Vitest coverage for local + mocked remote contexts.
- API: routes are not wired yet; CLI remote mode currently assumes the REST contract defined below.
- Docs/tests: database + core + CLI pieces are covered; API e2e coverage and README/OpenAPI updates still outstanding.

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

- [x] Create `ConfigService` with methods: `get(key)`, `set(key,value)`, `unset(key)`, `list(prefix?)`, `import(items, mode)`, `export(prefix?)`.
- [x] Define a storage interface `ConfigRepo` to decouple Core from DB drivers.
- [x] Add Zod schema to validate key format (`^[a-z0-9._:-]+$`) and JSON values.
- [x] Export types + service from `core` barrel for use by CLI and API.

## To-Do (CLI)

- [x] `sprongus config get <key>` (supports `--json`).
- [x] `sprongus config set <key> <value>` (supports `--json`, `--stdin`).
- [x] `sprongus config unset <key>`.
- [x] `sprongus config list` (supports `--prefix`, `--values`, `--json`).
- [x] `sprongus config import --file <path> [--merge|--replace]` (file format: object map `{key: value}`).
- [x] `sprongus config export [--prefix <str>] [--json]` (object map output).
- [x] Add `--remote` flag to all commands; default from `SPRONGUS_API_URL`.
- [x] Default SQLite path as described; support `SPRONGUS_DB_PATH` override and a `--db` flag.
- [x] CLI unit tests for local SQLite and mock API mode.

## To-Do (API)

- [x] `GET /v1/config` (list; supports `prefix`, `limit`, `offset`, `includeValues`; respond with `ConfigEntry[]` and ISO8601 `updatedAt` to satisfy CLI contract).
- [x] `GET /v1/config/:key` (return 200 with `ConfigEntry`; 404 should map to CLI "not found").
- [x] `PUT /v1/config/:key` (upsert via `{ value }` body; respond with updated `ConfigEntry`; treat as idempotent by state; defer full `Idempotency-Key` infra).
- [x] `DELETE /v1/config/:key` (accept repeated deletes; return 204; CLI tolerates 404 but avoid when possible).
- [x] `POST /v1/config:import` (accept `{ data: {key:value}, mode }`; respond with sorted `ConfigEntry[]`).
- [x] `GET /v1/config:export` (return `{ [key]: value }` map; honor `prefix` query).
- [x] Add request/response validation with Zod (optional `fastify-type-provider-zod`).
- [x] Wire endpoints to core `ConfigService` and DB-backed `ConfigRepo`.
- [x] Initialize DB connection on boot; close on shutdown.

## To-Do (Tests & Docs)

- [ ] Migration test: both SQLite and Postgres create/insert/query work (SQLite runs via Drizzle SQL fixtures; need automated Postgres runner tied to migrations).
- [x] Core service unit tests (Zod rejects bad keys/values; repo contract tests).
- [x] CLI e2e tests: `set/get/unset/list` round-trip (SQLite + mocked remote).
- [x] API e2e tests: Fastify inject for each endpoint.
- [ ] Update `db` README: system vs project config split; dialects and migration folders.
- [ ] Update `cli` README: usage examples for `sprongus config`; local DB path + overrides.
- [ ] Update `api` docs/OpenAPI spec; document idempotency expectations.

## DoD

- [x] ConfigKV table exists and migrates in SQLite + Postgres.
- [x] Core `ConfigService` passes unit tests.
- [x] CLI commands operate locally and via `-remote`.
- [x] API endpoints return correct responses, with validation + idempotency.
- [ ] Documentation updated to reflect new system-level config support.
