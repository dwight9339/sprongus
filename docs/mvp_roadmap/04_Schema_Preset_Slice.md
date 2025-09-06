# Schema Preset Slice

Status: Not started
Area: API, CLI, Core, DB
Docs: DB Table Schemas (https://www.notion.so/DB-Table-Schemas-262ae4aa36208003a16aeb5ef54427e6?pvs=21)

## Summary

Add a `SchemaPreset` slice for reusable, versioned virtual column sets (e.g., storyboard/assets/citations/custom). Presets are stored centrally, validated with Zod, and consumable by both CLI and API for project initialization and migrations.

Runtime model:

- CLI: local SQLite storage for presets during local workflows.
- API: Postgres storage backing remote preset management.

## Scope

- DB: Create `SchemaPreset` table with cross-dialect migrations (TEXT in SQLite, JSONB in Postgres for `definition`).
- Core: Zod schema for preset definitions; service to CRUD, validate, and resolve presets by `(label, version)`.
- CLI: `sprongus schema preset` commands to create/update/list/show/import/export.
- API: `/v1/schema-presets` endpoints mirroring CLI operations (no project mutation in this PR).

## Model Notes

- Columns:
  - `id` (text PK), `label` (text), `kind` (text), `definition` (TEXT/JSONB), `version` (int), `createdAt`, `updatedAt`
- Uniqueness: `(label, version)` unique to allow multiple versions of the same preset.
- Immutability: recommend **immutable `definition` once published**; updates require new `version`. (Allow `label` rename via admin if needed.)
- `definition` content: Zod-ish JSON with field list (name, type, optionality, enum/choices, default, UI hints).

## To-Do (DB)

- [ ] Define `SchemaPreset` table with:
- `id TEXT PRIMARY KEY`
- `label TEXT NOT NULL`
- `kind TEXT NOT NULL CHECK(kind IN ('storyboard','assets','citations','custom'))` (pg check; emulate in app for SQLite)
- `definition` (SQLite: TEXT; Postgres: JSONB)
- `version INTEGER NOT NULL`
- `createdAt TEXT NOT NULL` / `updatedAt TEXT NOT NULL` (ISO strings)
- [ ] Unique index on `(label, version)`
- [ ] Secondary index on `(kind, label)`
- [ ] Generate SQLite migrations
- [ ] Generate Postgres migrations (JSONB; optional GIN index if lookups by keys become common—skip for now)
- [ ] Cross-dialect migration tests (create/insert/query/unique)

## To-Do (Core)

- [ ] Zod schemas:
- `SchemaPresetKind` enum
- `SchemaPresetDefinition` (e.g., `{ fields: Array<{ name: string; type: 'string'|'number'|'boolean'|'json'|'enum'; required?: boolean; default?: unknown; enumValues?: string[]; }>, versionMeta?: Record<string, unknown> }`)
- Input/Update DTOs (`label`, `kind`, `definition`, `version`)
- [ ] Implement `SchemaPresetsService`:
- `create({ label, kind, definition, version })` (enforce unique `(label,version)`)
- `update({ id, patch })` (by policy, block changing `definition` after publish; allow metadata changes)
- `getById(id)` / `getByLabelVersion(label, version)`
- `list({ kind?, labelPrefix? })`
- `import(list, { mode: 'merge'|'replace' })`
- `export({ kind?, labelPrefix? })`
- `publish({ id })` (optional flag to lock `definition`)
- [ ] Validation helpers to check column names (safe charset), reserved words, and type compatibility with target tables
- [ ] Barrel export of types + service

## To-Do (CLI)

- [ ] `sprongus schema preset create --label <str> --kind <kind> --version <n> --file <json>`
- [ ] `sprongus schema preset update <id> --file <json>` (metadata-only if `definition` locked)
- [ ] `sprongus schema preset list [--kind <kind>] [--label <prefix>] [--json]`
- [ ] `sprongus schema preset show <id|label@version> [--json]`
- [ ] `sprongus schema preset import --file <path> [--merge|--replace]`
- [ ] `sprongus schema preset export [--kind <kind>] [--label <prefix>] [--json]`
- [ ] `--remote` support for all (default from `SPRONGUS_API_URL`); unit tests for local SQLite and mock API

## To-Do (API)

- [ ] Routes under `/v1/schema-presets`:
- `POST /v1/schema-presets` (create)
- `GET /v1/schema-presets` (list with filters)
- `GET /v1/schema-presets/:id` (or `label@version` via query)
- `PUT /v1/schema-presets/:id` (update metadata / version bump policy)
- `DELETE /v1/schema-presets/:id` (admin-only; soft delete optional)
- `POST /v1/schema-presets:import` / `GET /v1/schema-presets:export`
- [ ] Zod request/response validation; idempotency via `Idempotency-Key` on create/put
- [ ] Auth scopes: `presets:read`, `presets:write`
- [ ] Pagination for list results; sorting by `label`, `version`, `updatedAt`

## To-Do (Integration Hooks) — optional in this PR

- [ ] `SchemaPreset` resolver in project creation flow (choose a preset by `label@version`)
- [ ] Guardrails to prevent applying a preset kind to the wrong table type

## To-Do (Tests & Docs)

- [ ] Migration tests (Sqlite + Postgres) for unique `(label,version)`
- [ ] Core unit tests: validation of `definition`, create/list/get/update/import/export
- [ ] CLI e2e: create → list → show → export → import → list
- [ ] API e2e: supertest coverage for all endpoints incl. validation failures
- [ ] Docs:
- README section: what a preset is, `kind` semantics, versioning policy
- JSON schema example with a few fields and enum usage
- CLI usage examples; API OpenAPI entries

## DoD

- [ ] `SchemaPreset` table migrates on SQLite and Postgres; unique and secondary indexes in place
- [ ] Zod validation rejects bad `definition`s and invalid field names/types
- [ ] Core service passes unit tests; immutable-definition policy enforced if enabled
- [ ] CLI commands function locally and with `-remote`
- [ ] API endpoints validate inputs, paginate lists, and return correct DTOs
- [ ] Documentation updated with examples and versioning guidance
