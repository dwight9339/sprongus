# Storyboard Slice

Status: Not started
Area: API, CLI, Core, DB

## Summary

Implement the Storyboard slice that

1. Materializes a provider-backed storyboard table per project
2. Keeps it in one-way sync with the current ScriptDocument
3. Reserves row-level production metadata (extras, assets, citations). Provide CRUD for rows, schema-preset validation, and exports. Expose via CLI/API and integrate with the Run/job system.

## Scope

- DB: Portable tables for storyboard rows and (optional) row history, designed for JSON-friendly “extras” and ID arrays for assets/citations.
- Core: Types, validation (presets), diff/sync engine from Script → Storyboard, row CRUD, and provider adapters.
- CLI: Commands to sync, list, update, and export storyboard rows; helpers to manage asset/citation links.
- API: Read/modify endpoints; actions to sync via Run; provider-backed apply/patch.
- Tests & Docs: Cross-dialect migration tests, unit/e2e coverage, and usage docs.

## Data Model

### Tables

- **StoryboardRows** (authoritative cached view for the project)
  - `rowId TEXT PK` — stable per storyboard row
  - `projectId TEXT NOT NULL`
  - `beatId TEXT NULL` — points at Script node (usually a beat)
  - `idx INTEGER NOT NULL` — sortable numeric order (e.g., 01.02 → 10200)
  - Canonical columns:
    - `beatText TEXT NULL`
    - `visualDescription TEXT NULL`
  - **Flexible columns**:
    - `extras` — JSON (SQLite: TEXT; Postgres: JSONB) for preset-defined fields
    - `assetIds TEXT` (JSON array of strings) — IDs resolved by Assets provider
    - `citationIds TEXT` (JSON array of strings) — IDs resolved by Citations provider
  - `createdAt TEXT`, `updatedAt TEXT`
  - Indexes:
    - `(projectId, idx)`
    - `(projectId, beatId)` (nullable)
    - (pg) GIN index on `extras` (optional; add later if needed)
- **StoryboardRowVersions** (optional; append-only)
  - `id TEXT PK`, `rowId TEXT`, `projectId TEXT`, `snapshot` (TEXT/JSONB), `changeSummary TEXT`, `createdAt TEXT`
  - Index `(projectId, rowId, createdAt DESC)`

> If you prefer to skip StoryboardRowVersions in v1, include only updatedAt on StoryboardRows and rely on ScriptVersion history for audit.

### JSON shapes (core types)

- `extras: Record<string, unknown>` — validated against a `SchemaPreset` of kind `storyboard`
- `assetIds: string[]` and `citationIds: string[]` — stable IDs; metadata resolved on demand from respective providers

## To-Do (DB)

- [ ] Define `StoryboardRows` schema (portable columns + JSON fields)
- [ ] (Optional) Define `StoryboardRowVersions`
- [ ] Generate SQLite migrations (TEXT for JSON fields)
- [ ] Generate Postgres migrations (JSONB for JSON fields; optional GIN on `extras`)
- [ ] Add indexes listed above
- [ ] Cross-dialect migration tests (create/insert/query/sort by idx)

## To-Do (Core)

### Types & Validation

- [ ] `StoryboardRow` TS type + Zod schema (incl. `extras` shaped by a chosen `SchemaPreset`)
- [ ] `StoryboardUpdate` input schema (partial updates; extras validated; assetIds/citationIds arrays)
- [ ] `StoryboardSyncOptions` (e.g., how to map Script nodes → rows, archive policy)

### Services

- [ ] `StoryboardService.sync({ projectId, scriptDoc, preset, providerProfile })`
- Compute desired rows from ScriptDocument (beat-aligned)
- Diff with current `StoryboardRows`:
- Create missing rows (with default extras from preset)
- Update `beatText`, `visualDescription` if changed
- Move rows when `idx`/parent changes
- Archive/delete rows for removed beats (configurable: hard delete vs. `extras.status='archived'`)
- **Preserve** `extras`, `assetIds`, `citationIds` when beat mapping remains (don’t clobber)
- Optionally write to provider (Notion/CSV) if configured as source of truth
- [ ] `StoryboardService.list({ projectId, q?, kindFilters?, limit?, offset? })` — supports filtering/sorting
- [ ] `StoryboardService.get({ projectId, rowId })`
- [ ] `StoryboardService.update({ projectId, rowId, patch })` — validate with preset; return updated row
- [ ] `StoryboardService.bulkUpdate({ projectId, updates[] })`
- [ ] `StoryboardService.export({ projectId, format: 'csv'|'json' })`

### Diff & Mapping Helpers

- [ ] Deterministic `idx` computation from Script tree (e.g., base-100 or base-1000 per depth)
- [ ] Stable `rowId` strategy:
- Prefer `beatId` if present; else derive `rowId` from content hash + ancestry
- [ ] Change summary generator (created/updated/moved/deleted counts)

### Provider Abstractions

- [ ] `StoryboardProvider` interface:
- `pull(projectId): Promise<Partial<StoryboardRow>[]>` — load current remote rows (for cache warm)
- `push(changes): Promise<void>` — apply created/updated/moved/deleted rows (if provider is writable)
- [ ] Providers:
- **NotionStoryboardProvider** (table DB): pull/push (writable)
- **CsvStoryboardProvider** (local/Obsidian-friendly): pull/push via CSV; map columns to extras
- Mark provider capabilities (read/write) and handle read-only gracefully

## To-Do (CLI)

- [ ] `sprongus storyboard sync <project>`
- Flags: `-provider <id>`, `-preset <label@version>`, `-remote`
- Prints change summary; suggests a `runs tail` if enqueued remotely
- [ ] `sprongus storyboard list <project>`
- Flags: `-q <substr>`, `-limit`, `-json`, `-columns <comma>`, `-filter <k=v>` (works on extras keys)
- [ ] `sprongus storyboard show <project> <rowId> [--json]`
- [ ] `sprongus storyboard update <project> <rowId> --set key=value` (extras)
- Multi `-set` allowed; supports `-json` payload
- [ ] `sprongus storyboard link-assets <project> <rowId> --add <id,id,...> [--remove <...>]`
- [ ] `sprongus storyboard link-citations <project> <rowId> --add <id,id,...> [--remove <...>]`
- [ ] `sprongus storyboard export <project> --format csv|json --out <path>`
- [ ] All commands support `-remote`; unit/e2e tests (SQLite local + mock API)

## To-Do (API)

- [ ] Routes under `/v1/storyboard`:
  - [ ] `POST /:projectId:sync` → enqueue `sync.storyboard` Run (Idempotency-Key supported)
  - [ ] `GET /:projectId/rows` → list (filters: q, extras filters, pagination, sort by idx)
  - [ ] `GET /:projectId/rows/:rowId` → get one
  - [ ] `PATCH /:projectId/rows/:rowId` → update `extras`, `visualDescription`, asset/citation IDs
  - [ ] `POST /:projectId/rows:bulk` → bulkUpdate
  - [ ] `GET /:projectId:export?format=csv|json` → export stream
- [ ] Request/response Zod validation; pagination caps; error normalization
- [ ] Auth scopes: `storyboard:read`, `storyboard:write` with project authorization

## To-Do (Runs/Worker Integration)

- [ ] Add Run kinds: `sync.storyboard`
- [ ] Worker handler:
  - Fetch ScriptDocument (current) + Preset → call `StoryboardService.sync`
  - If provider is writable, push changes (respect provider rate limits)
  - Update `Run.outputRef` with diff summary artifact (JSON/Markdown) and stats
  - On failure, store message in `Run.error`

## To-Do (Schema Presets Integration)

- [ ] Use `SchemaPreset(kind='storyboard')` to validate/shape `extras`
- [ ] Defaults: when creating rows, populate `extras` defaults from preset
- [ ] Guard: refuse updates that violate preset types/enums

## To-Do (Assets/Citations Integration)

- [ ] Treat `assetIds`/`citationIds` as **references only** in StoryboardRows
- [ ] Resolution of metadata is delegated to Assets/Citations providers on demand
- [ ] CLI/API never embeds asset/citation payloads into storyboard rows; provide joins in memory/view models

## To-Do (Security & Ops)

- [ ] No secrets in storyboard rows; provider secrets resolved at runtime via ProviderProfile/SecretKV
- [ ] Redact large `beatText`/`visualDescription` in logs; cap payload sizes in responses
- [ ] Observability: counters for created/updated/moved/deleted per sync; latency histograms

## To-Do (Tests & Docs)

- [ ] DB migration tests (SQLite + Postgres)
- [ ] Unit tests: idx computation, stable rowId mapping, diff preservation of extras/links
- [ ] Service tests: Script → Storyboard sync scenarios (add/move/delete) with preset validation
- [ ] Provider tests: Notion mock (API shape) and CSV round-trip fixtures
- [ ] CLI e2e: sync/list/update/link/export (local + `-remote`)
- [ ] API e2e: list/get/patch/bulk/export; enqueue sync; auth guards
- [ ] Docs:
  - Storyboard lifecycle (diagram), one-way sync from Script
  - Preset usage (defining storyboard extras)
  - Provider setup (Notion/CSV) with mapping examples
  - “Linking assets/citations” how-to

## DoD

- [ ] `StoryboardRows` migrates on SQLite and Postgres; indexes verified; (optional) versions table in place
- [ ] Sync from Script produces correct creates/updates/moves/deletes while preserving `extras` and links
- [ ] CLI can sync/list/update/link/export locally and with `-remote`
- [ ] API exposes validated endpoints; supports pagination and filtering on extras
- [ ] Worker executes `sync.storyboard` and records results on Run
- [ ] Docs cover lifecycle, presets, providers, and asset/citation linking
