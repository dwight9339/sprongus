# Script Slice

Status: Not started
Area: API, CLI, Core, DB

## Summary

Implement the Script slice that:

1. Pulls raw blocks from a provider
2. Parses them into a typed ScriptDocument using a selected structure preset.
3. Diffs against the local cache.
4. Updates storage and emits changes. Support push (where the provider allows it) and exporters. Expose the functionality via CLI and API, and wire into the Run/job system for long operations.

Runtime model:

- CLI: local SQLite storage for script caches and indexes.
- API: Postgres storage for multi-user/remote.

## Scope

- DB: Introduce minimal, portable tables for script caching and versioning (SQLite for CLI; Postgres for API). JSON is TEXT in SQLite and JSONB in Postgres.
- Core: Define contracts (Provider, StyleParser, StructurePreset), ScriptDocument model, parsing/diff/hashing, and an orchestration service.
- CLI: Commands to pull/push/export/show scripts, plus status helpers; support `--remote` (default from `SPRONGUS_API_URL`).
  - Project resolution: commands accept an explicit `<project>`; if omitted, use the active project from ConfigKV or env `SPRONGUS_PROJECT`.
- API: Read endpoints (get/list/diff/export) and action endpoints (pull/push via Run enqueue).
- Tests & Docs: Unit + e2e across providers; developer docs and examples.

## Model Notes

- ScriptDocument (in memory):
  - Root → nested nodes (`section`, `paragraph`, `beat`) or flat beats (depending on preset).
  - Each node has: `id`, `kind`, `parentId`, `idx` (numeric order), `text`, `meta` (JSON), `hash`.
- IDs:
  - Prefer provider-native block ids when stable; else deterministic ULID/CUID with content-based suffix for stability.
- Hashing:
  - Node hash = stable hash of `{kind,text,meta,childrenHashes}` (avoid timestamps).
  - Document hash = hash of top-level node hashes.
- Diff:
  - Detect create/update/delete/move on nodes; moves detected via `id` continuity + `parentId/idx` change.

## To-Do (DB)

- [ ] Define `Scripts` table (latest per project):
- `id TEXT PK`, `projectId TEXT NOT NULL`, `docHash TEXT NOT NULL`,
  `root TEXT/JSONB NOT NULL` (canonical serialized ScriptDocument),
  `createdAt TEXT`, `updatedAt TEXT`
- Unique index `(projectId)` for “current” (or keep pointer in Project; pick one).
- [ ] Define `ScriptVersions` table (append-only history):
- `id TEXT PK`, `projectId TEXT NOT NULL`, `docHash TEXT NOT NULL`,
  `root TEXT/JSONB NOT NULL`, `changeSummary TEXT`, `createdAt TEXT`
- Index `(projectId, createdAt DESC)`
- [ ] Define `ScriptIndex` table (optional, speeds queries & storyboard sync):
- `id TEXT PK` (node id), `projectId TEXT NOT NULL`,
  `kind TEXT NOT NULL`, `parentId TEXT`, `idx INTEGER`,
  `text TEXT`, `meta TEXT/JSONB`, `nodeHash TEXT NOT NULL`,
  `versionId TEXT NOT NULL`
- Index `(projectId, kind, parentId, idx)`
- [ ] SQLite migrations: `root`/`meta` as TEXT (JSON string).
- [ ] Postgres migrations: `root`/`meta` as JSONB; add GIN index on `ScriptIndex(meta)` if needed later.
- [ ] (Optional) FK from `Scripts`/`ScriptVersions`.`projectId` to `Project` when that table exists.
- [ ] Cross-dialect migration tests (create/insert/query/indexes).

## To-Do (Core)

- [ ] Types & Contracts
  - [ ] `ScriptNodeKind` = `"section" | "paragraph" | "beat"`
  - [ ] `ScriptNode` & `ScriptDocument` types
  - [ ] `ScriptStructurePreset` (levels & labels)
  - [ ] `ProviderBlock` (normalized raw block contract)
  - [ ] `ScriptProvider` interface: `fetchBlocks()`, `push(document)?: Promise<void>`
  - [ ] `ScriptStyleParser` interface: `parse(provider, rootId, structurePreset) → ScriptDocument`
- [ ] Parsing & Diff
  - [ ] Implement initial style parser (choose one: `nested-list` or `heading`)
  - [ ] Hashing helpers (stable, deterministic)
  - [ ] Diff engine: compute operations (create/update/delete/move) between two ScriptDocuments
  - [ ] Change summary generator (counts by kind; first N title/beat text lines)
- [ ] Services
  - [ ] `ScriptService.pull({ projectId, providerProfile, structurePreset, rootBlockId })`
    - fetch blocks → parse → diff vs cache → write `ScriptVersions` and update `Scripts`/`ScriptIndex`
  - [ ] `ScriptService.push({ projectId, providerProfile })` (no-op for read-only providers)
  - [ ] `ScriptService.export({ projectId, format })` (txt/markdown to start)
  - [ ] `ScriptService.get({ projectId })` (current doc)
  - [ ] `ScriptService.getVersion({ versionId })` / `listVersions({ projectId, limit, before })`
  - [ ] `ScriptService.diffVersions({ a, b })` → op set + summary
- [ ] Validation
  - [ ] Zod schema for `ScriptDocument` shape (guards kind/levels/ids)
  - [ ] Zod for provider configs used during `pull`/`push`
- [ ] Performance
  - [ ] Incremental index updates (only touched nodes) when diff small
  - [ ] Cap text lengths in `ScriptIndex.text` (full text remains in `root`)

## To-Do (CLI)

- [ ] `sprongus script pull <project>`
- flags: `-src <providerId>`, `-root <blockId>`, `-preset <id>`, `-remote`
- prints change summary; returns version id
- [ ] `sprongus script push <project>`
- flags: `-target <providerId>`, `-remote`
- warn if provider is read-only
- [ ] `sprongus script show <project>`
- flags: `--json` (full document), `--tree` (pretty tree), `--flat` (beats only)
- [ ] `sprongus script versions <project>`
- flags: `--limit`, `--json`
- [ ] `sprongus script diff <project> --from <ver> --to <ver>`
- output op counts + sample lines
- [ ] `sprongus script export <project> --format <txt|md> --out <path>`
- [ ] `sprongus script status <project>`
- shows current doc hash, last pull/push time, provider info
- [ ] Unit/e2e tests: pull/diff/write/export (SQLite local) + `--remote` mock

## To-Do (API)

- [ ] Routes under `/v1/scripts`:
  - [ ] `GET /v1/scripts/:projectId` → current document (optionally `?view=flat|tree`; default masked/trimmed)
  - [ ] `GET /v1/scripts/:projectId/versions` → list (paginate)
  - [ ] `GET /v1/scripts/versions/:versionId` → version snapshot
  - [ ] `GET /v1/scripts/:projectId:export?format=txt|md` → artifact stream
  - [ ] `POST /v1/scripts/:projectId:pull` → enqueue Run (Idempotency-Key supported)
  - [ ] `POST /v1/scripts/:projectId:push` → enqueue Run (if provider supports)
  - [ ] `POST /v1/scripts:diff` → body `{ a: versionId, b: versionId }`
- [ ] Zod validation for requests/responses; pagination caps
- [ ] Auth scopes: `scripts:read`, `scripts:write` and project access checks
- [ ] Rate-limit mutating actions; emit events (`script.pulled`, `script.pushed`)

## To-Do (Worker / Runs Integration)

- [ ] Implement Run kinds: `script.pull`, `script.push`
- [ ] Worker handlers call `ScriptService.pull/push`
- [ ] Write `outputRef` to artifacts/logs bucket if generating exports as part of runs
- [ ] Update `Run.state` + `error` on completion/failure

## To-Do (Providers)

- [ ] `NotionScriptProvider` (initial):
  - [ ] `fetchBlocks({ rootBlockId })` → normalized ProviderBlocks
  - [ ] (Optional) `push(document)` — if feasible; otherwise mark read-only
- [ ] `MarkdownScriptProvider` (local):
  - [ ] Parse file(s) into ProviderBlocks; track headings/lists for structure presets
- [ ] Provider registry: resolve by profile id; consistent error surface for “not configured”

## To-Do (Exporters)

- [ ] `TxtExporter`: flat beats or structured with headings
- [ ] `MarkdownExporter`: headings/indent levels based on structure preset
- [ ] Hook both into CLI/API export paths

## To-Do (Security & Ops)

- [ ] Do not store provider secrets in script tables; resolve via ProviderProfile/SecretKV at runtime
- [ ] Redact provider ids/urls in logs where appropriate
- [ ] Observability: log doc hashes & counts (not raw text) at info level; raw text only in debug with flags

## To-Do (Tests & Docs)

- [ ] DB migration tests (SQLite + Postgres)
- [ ] Parser unit tests for selected style (nested-list or heading)
- [ ] Diff tests: create/update/delete/move scenarios
- [ ] Service tests: pull → diff → write → listVersions → get current
- [ ] CLI e2e: pull/show/versions/diff/export
- [ ] API e2e: list/get/version/diff/export; enqueue pull/push (with Run)
- [ ] Provider tests: fixtures for provider block shapes; edge cases (empty sections, deep nesting)
- [ ] Docs:
  - [ ] “Script model & lifecycle” page (diagram of provider → parser → diff → cache)
  - [ ] Structure presets guide & examples
  - [ ] Provider setup guide (Notion/Markdown) and capabilities matrix (pull/push)
  - [ ] Exporter format examples

## DoD

- [ ] Migrations present and green for SQLite and Postgres; current doc + versions persisted
- [ ] First style parser implemented and validated; ScriptService pull produces version history with accurate diffs
- [ ] CLI can pull/show/versions/diff/export locally and with `-remote`
- [ ] API exposes read & action endpoints; enqueues runs; returns correct DTOs
- [ ] Worker executes `script.pull` and updates `Run` states
- [ ] Documentation updated with lifecycle, preset usage, and provider setup
