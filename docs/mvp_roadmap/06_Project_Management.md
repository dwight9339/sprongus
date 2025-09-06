# Project Management

Status: Not started
Area: API, CLI, Core, DB

## Summary

Introduce a first-class Project model to group script, storyboard, and aux tables under a named scope. Provide CRUD, selection of an “active project” for CLI workflows, and default bindings to providers and schema presets. Expose via CLI and API. This slice standardizes how all other slices accept `projectId` and how the CLI resolves a default project when one isn’t provided.

Runtime model:

- CLI: stores projects in local SQLite; remembers an active project selection in local ConfigKV.
- API: stores projects in Postgres; exposes multi-user project management via HTTP.

## Scope

- DB: Add `Projects` table with portable columns and per-dialect migrations.
- Core: `ProjectsService` with CRUD, validation, and active-project resolution helpers.
- CLI: `sprongus project` commands to create/list/show/update/delete/select/current.
- API: `/v1/projects` endpoints mirroring CLI operations.
- Integration: unify `projectId` handling across Config, Secrets, Script, Storyboard, Aux, Runs.

## Decisions

- Identity: stable `id` (ULID/CUID) and human `slug` (unique, URL-safe) for selection via CLI/API.
- Presets/Providers: keep optional default references on Project (e.g., `defaultScriptProviderId`, `defaultStoryboardProviderId`, `defaultStoryboardPreset`, `defaultAuxPresetMap`), but do not require them for creation.
- Metadata: support a `meta` JSON object for future extensions; TEXT in SQLite, JSONB in Postgres.
- Active project resolution (CLI): precedence `--project` flag → env `SPRONGUS_PROJECT` (slug or id) → locally stored selection in ConfigKV (`project.active`).
- Idempotency: API `POST /v1/projects` accepts `Idempotency-Key`; CLI create is naturally idempotent by slug (if provided).
- Deletion policy: soft delete optional; v1 performs hard delete and fails if foreign-key references exist (or cascades if we enable it later).
- Flags: use `--json` for structured output; `--remote` selects API base URL (default from `SPRONGUS_API_URL` or `http://localhost:3000`).

## Model Notes

### Table: Projects

- `id TEXT PRIMARY KEY`
- `slug TEXT UNIQUE NOT NULL` — URL-safe `[a-z0-9-_.]+`, lowercased
- `name TEXT NOT NULL`
- `description TEXT NULL`
- `meta` — SQLite: `TEXT` (JSON string); Postgres: `JSONB`
- Optional defaults (nullable):
  - `defaultScriptProviderId TEXT`
  - `defaultStoryboardProviderId TEXT`
  - `defaultStoryboardPreset TEXT` — e.g., `label@version`
  - `defaultAuxPresetMap TEXT/JSONB` — map of tableName → `label@version`
- `createdAt TEXT NOT NULL`, `updatedAt TEXT NOT NULL`
- Indexes:
  - unique(`slug`)
  - (optional) `(createdAt DESC)` for listing

> FK relations to ProviderProfile/SchemaPreset can be added later; in v1 they’re stored as strings and validated in Core when used.

## To-Do (DB)

- [ ] Define `Projects` schema with columns above.
- [ ] Generate SQLite migrations (JSON as TEXT; timestamps as ISO strings).
- [ ] Generate Postgres migrations (JSONB; indexes as noted).
- [ ] Cross-dialect migration tests (create/insert/query/unique by slug).

## To-Do (Core)

- [ ] Zod schemas:
  - `ProjectSlug` regex and normalization (lowercase)
  - Create/Update DTOs
  - Default refs and `meta` validation (loose record for now)
- [ ] Implement `ProjectsService`:
  - `create({ slug?, name, description?, defaults?, meta? })`
  - `update({ id|slug, patch })`
  - `delete({ id|slug })` (guard if referenced; policy: hard delete v1)
  - `get({ id|slug })`
  - `list({ q?, limit?, before? })`
  - `setActive({ id|slug })` and `getActive()` — stored in ConfigKV key `project.active`
  - `resolveProjectId({ explicit?, env?, config? })` — precedence logic described above
- [ ] Barrel export types + service for CLI/API usage.

## To-Do (CLI)

- [ ] `sprongus project create <name> [--slug <slug>] [--desc <text>] [--json]`
- [ ] `sprongus project list [--q <substr>] [--limit <n>] [--json]`
- [ ] `sprongus project show <id|slug> [--json]`
- [ ] `sprongus project update <id|slug> [--name <str>] [--desc <text>] [--json]`
- [ ] `sprongus project delete <id|slug> [--force]`
- [ ] `sprongus project select <id|slug>` — sets local ConfigKV `project.active`
- [ ] `sprongus project current` — prints current selection (resolves via precedence)
- [ ] All commands support `--remote` (default from `SPRONGUS_API_URL`); `--json` outputs structured records
- [ ] CLI unit/e2e tests (SQLite local + mock API for remote)

## To-Do (API)

- [ ] Routes under `/v1/projects`:
  - `POST /v1/projects` (create; respects `Idempotency-Key`)
  - `GET /v1/projects` (list + filters; paginate)
  - `GET /v1/projects/:idOrSlug` (show)
  - `PUT /v1/projects/:idOrSlug` (update)
  - `DELETE /v1/projects/:idOrSlug` (delete; guard/cascade policy)
- [ ] Zod request/response validation; error normalization
- [ ] Auth scopes: `projects:read`, `projects:write`; enforce tenant access if multi-user later

## To-Do (Integration)

- [ ] Update other slices to accept `{ projectId }` consistently
- [ ] In CLI flows, resolve project via `ProjectsService.resolveProjectId` if not explicitly provided
- [ ] In API flows, require `:projectId` path params where applicable; or accept `?project=` slug and resolve server-side

## To-Do (Tests & Docs)

- [ ] Migration tests (SQLite + Postgres)
- [ ] Core unit tests: slug validation, CRUD, active selection precedence
- [ ] CLI e2e: create → select → current → list/show/update/delete
- [ ] API e2e: create/list/get/update/delete; idempotency on create
- [ ] Docs:
  - README section: projects, slugs, active selection
  - CLI examples for create/select/current
  - API OpenAPI entries

## DoD

- [ ] `Projects` table migrates on SQLite and Postgres; unique slug enforced
- [ ] `ProjectsService` passes unit tests; active project stored in ConfigKV
- [ ] CLI can manage projects locally and with `--remote`; selection works across commands
- [ ] API exposes validated endpoints with pagination and idempotent create
- [ ] Docs updated; other slices accept and consistently use `projectId`
