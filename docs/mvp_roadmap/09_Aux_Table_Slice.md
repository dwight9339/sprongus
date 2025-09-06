# Aux Table Slice

Status: Not started
Area: API, CLI, Core, DB

## Summary

Implement the Aux Tables slice for project-scoped, flexible metadata tables (e.g., assets, citations, or custom). Aux entries are schema-validated via SchemaPresets, cached locally, optionally backed by a remote provider, and linked from Storyboard rows by ID (not embedded). Provide CRUD, import/export, and provider sync. Expose via CLI/API; integrate with Runs for long operations.

Runtime model:

- CLI: local SQLite storage for aux entries.
- API: Postgres storage for remote multi-user workflows.

## Scope

- DB: A single portable `AuxEntries` table (plus optional history), JSON-friendly payload, and indexes for common queries.
- Core: Types, Zod validation using `SchemaPreset(kind='assets'|'citations'|'custom')`, services for CRUD/bulk, provider adapters, and sync orchestration.
- CLI: Commands to create/update/list/link/import/export aux entries.
- API: Endpoints to manage and query aux entries (and bulk ops), plus a sync action.
- Integrations: Storyboard (reference by IDs), Providers (read/write where supported), Runs (for sync jobs).

## Data Model

### Tables

- **AuxEntries** (authoritative cached view)
  - `id TEXT PRIMARY KEY`
  - `projectId TEXT NOT NULL`
  - `tableName TEXT NOT NULL` — e.g., `"assets"`, `"citations"`, or custom
  - `payload TEXT/JSONB NOT NULL` — JSON blob shaped by the preset
  - `lastUpdated TEXT NOT NULL`
  - Indexes:
    - `(projectId, tableName)`
    - Optional `(projectId, tableName, lastUpdated DESC)`
    - (pg) optional GIN on `payload` later if needed
- **AuxEntryVersions** (optional; append-only history)
  - `id TEXT PK`, `entryId TEXT`, `projectId TEXT`, `tableName TEXT`,
    `snapshot TEXT/JSONB`, `changeSummary TEXT`, `createdAt TEXT`
  - Index `(projectId, tableName, createdAt DESC)`

> If you want a lighter v1, skip AuxEntryVersions and rely on lastUpdated.

## To-Do (DB)

- [ ] Define `AuxEntries` schema (portable JSON column: TEXT on SQLite, JSONB on Postgres)
- [ ] (Optional) Define `AuxEntryVersions`
- [ ] Generate SQLite migrations
- [ ] Generate Postgres migrations (+ optional GIN on `payload`)
- [ ] Add indexes listed above
- [ ] Cross-dialect migration tests (create/insert/query)

## To-Do (Core)

### Types & Validation

- [ ] `AuxTableName` type (string) + well-known constants: `"assets"`, `"citations"`
- [ ] `AuxEntry<T extends Record<string, unknown>>` TS type
- [ ] Resolve preset: `SchemaPreset(kind = 'assets'|'citations'|'custom')`
- [ ] Zod builder that derives a runtime validator from the chosen preset definition
- [ ] Reserved field rules: forbid clobbering `id`, `projectId`, `tableName`, `lastUpdated`

### Services

- [ ] `AuxService.create({ projectId, tableName, payload })`
- [ ] `AuxService.update({ projectId, id, patch })` (deep-merge by default; `-replace` option for full)
- [ ] `AuxService.upsert({ projectId, tableName, id?, payload })`
- [ ] `AuxService.delete({ projectId, id })`
- [ ] `AuxService.get({ projectId, id })`
- [ ] `AuxService.list({ projectId, tableName, q?, filter?, sort?, limit?, offset? })`
  - `q` is substring match over selected text fields; `filter` supports simple key=value on payload
- [ ] `AuxService.bulkUpsert({ projectId, tableName, items[], mode })`
- [ ] `AuxService.import({ projectId, tableName, file|items, mode: 'merge'|'replace' })`
- [ ] `AuxService.export({ projectId, tableName, format: 'json'|'csv' })`

### Provider Abstractions

- [ ] `AuxProvider` interface per table:
  - `pull({ projectId, tableName }): Promise<AuxEntry[]>`
  - `push({ projectId, tableName, changes }): Promise<void>` (created/updated/deleted)
  - Capability flags: `{ read: true, write: boolean }`
- [ ] Providers (first pass):
  - `CsvAuxProvider` (local/Obsidian-friendly; one CSV per table)
  - `NotionAuxProvider` (optional if you store assets/citations there)
- [ ] Provider registry + mapping from `ProviderProfile` to concrete providers

### Storyboard Integration

- [ ] Conventions:
  - Storyboard rows store **only** arrays of IDs: `assetIds: string[]`, `citationIds: string[]`
- [ ] `AuxService.resolveRefs({ projectId, tableName, ids[] })` → returns lightweight view models for UI/export
- [ ] Guardrails: when deleting an aux entry, optionally warn if referenced by storyboard rows

### Performance & Limits

- [ ] Cap payload field sizes where reasonable (e.g., large blobs should live in object storage with a URL in payload)
- [ ] Keep text search simple initially (client-side filtering), add pg indexes later if needed

## To-Do (CLI)

- [ ] `sprongus aux list <project> <tableName> [--q <substr>] [--filter k=v] [--json] [--limit N]`
- [ ] `sprongus aux show <project> <tableName> <id> [--json]`
- [ ] `sprongus aux create <project> <tableName> --set k=v --set ... [--json <payload>]`
- [ ] `sprongus aux update <project> <tableName> <id> --set k=v [...] [--replace --json <payload>]`
- [ ] `sprongus aux delete <project> <tableName> <id> [--force]`
- [ ] `sprongus aux import <project> <tableName> --file <path> [--merge|--replace]`
- [ ] `sprongus aux export <project> <tableName> --format json|csv --out <path>`
- [ ] `sprongus aux sync <project> <tableName> [--provider <id>] [--remote]` (enqueues Run if remote)
- [ ] All commands support `--remote` (default from `SPRONGUS_API_URL`); unit/e2e tests (SQLite local + mock API)
- Project resolution: commands accept explicit `<project>`; if omitted, use active project from ConfigKV or env `SPRONGUS_PROJECT`.

## To-Do (API)

- [ ] Routes under `/v1/aux/:tableName`
  - [ ] `GET /:projectId` → list (filters: q, payload filters, pagination, sort)
  - [ ] `GET /:projectId/:id` → fetch one
  - [ ] `POST /:projectId` → create (validates via preset)
  - [ ] `PUT /:projectId/:id` → replace (validates)
  - [ ] `PATCH /:projectId/:id` → partial update (validates patch)
  - [ ] `DELETE /:projectId/:id`
  - [ ] `POST /:projectId:bulkUpsert` → bulk create/update (mode param)
  - [ ] `POST /:projectId:import` / `GET /:projectId:export?format=json|csv`
  - [ ] `POST /:projectId:sync` → enqueue Run
- [ ] Request/response Zod validation; pagination caps & sorting
- [ ] Auth scopes: `aux:read`, `aux:write`; enforce project access

## To-Do (Runs/Worker Integration)

- [ ] Add Run kind: `sync.aux/<tableName>`
- [ ] Worker handler:
  - Pull from provider → diff with local `AuxEntries` → apply changes locally
  - If provider writeable and configured as source, push local changes upstream
  - Record stats and write `Run.outputRef` with diff summary artifact
- [ ] Idempotency: support `Idempotency-Key` for sync requests

## To-Do (Schema Presets Integration)

- [ ] Require a `SchemaPreset` for each aux `tableName` used by the project
- [ ] Validate `payload` on create/update/import against the preset
- [ ] Provide defaults from preset when creating entries
- [ ] Reject updates that violate types/enums/required fields

## To-Do (Security & Ops)

- [ ] Keep secrets out of payload; only store secret **refs** (if needed), resolved at runtime via `SecretKV`
- [ ] Redact large text fields in logs; cap response sizes
- [ ] Observability: counters (created/updated/deleted), latency metrics for sync; basic audit events

## To-Do (Tests & Docs)

- [ ] DB migration tests (SQLite + Postgres)
- [ ] Core unit tests:
  - Validation against presets (good/bad payloads)
  - CRUD & bulkUpsert behavior
  - Import/export round-trip (json/csv)
- [ ] Provider tests:
  - CSV provider round-trip with fixtures
  - (Optional) Notion provider mocked API tests
- [ ] Storyboard integration tests:
  - Linking/unlinking IDs; safe deletion warnings when referenced
- [ ] CLI e2e: list/show/create/update/delete/import/export/sync (local + `-remote`)
- [ ] API e2e: full CRUD, filters, pagination, bulk ops, sync enqueue
- [ ] Docs:
  - “Aux Tables 101” (concepts, presets, provider mapping)
  - Per-table examples (`assets`, `citations`) with recommended fields
  - CLI examples and API OpenAPI entries

## DoD

- [ ] `AuxEntries` migrates on SQLite and Postgres; indexes verified
- [ ] Payloads validated against `SchemaPreset`; defaults applied on create
- [ ] CLI can manage aux tables locally and with `-remote`; export/import works
- [ ] API exposes validated endpoints with filters, pagination, and bulk ops
- [ ] Worker runs `sync.aux/<tableName>` and records outcomes in `Run`
- [ ] Storyboard rows successfully reference aux entries by ID; resolution helpers work
- [ ] Docs updated with presets, provider setup, and CLI/API examples
