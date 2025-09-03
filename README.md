Sprongus

Overview

- Purpose: A script–storyboard syncing utility. Pulls structured script content from providers (e.g., Notion/Markdown), materializes a storyboard table, and preserves production metadata (extras, assets, citations). Local-first via SQLite for CLI; API-ready for multi-user and remote orchestration.
- Monorepo: pnpm workspaces with apps and packages.
  - `apps/api` (`@sprongus/api`): Fastify REST API (scaffolded; health route).
  - `apps/cli` (`@sprongus/cli`): oclif-based CLI (scaffolded; hello command).
  - `packages/core` (`@sprongus/core`): Core types and services (stubbed).
  - `packages/db` (`@sprongus/db`): Drizzle ORM layer (stubbed).

Quick Start

- Prereqs: `Node 20+`, `pnpm 8+`.
- Install: `pnpm install`
- Build all: `pnpm -w build`
- Lint/format: `pnpm lint` / `pnpm format`
- Tests: `pnpm test`

Run Apps

- API
  - Build: `pnpm --filter @sprongus/api run build`
  - Start: `pnpm --filter @sprongus/api run start` (listens on `0.0.0.0:3000`)
  - Health: GET `http://localhost:3000/health` → `{ ok: true }`
- CLI
  - Build: `pnpm --filter @sprongus/cli run build`
  - Run: `node apps/cli/dist/bin/run.js hello [name]`

Repository Layout

- `apps/api`: Fastify server entry `src/index.ts`; future routes under `src/routes/`.
- `apps/cli`: oclif entry `src/bin/run.ts`; commands under `src/commands/`.
- `packages/core`: Library entry `src/index.ts`.
- `packages/db`: DB entry `src/index.ts`; Drizzle schema/migrations to be added.
- `mvp_roadmap/`: Planning docs for each slice (links below).

Development

- TypeScript: ESM across workspaces; sources in `src/`, build output in `dist/`.
- Linting: ESLint flat config with `@eslint/js` + `typescript-eslint` (type-aware) and `eslint-config-prettier`.
- Formatting: Prettier with double quotes (`singleQuote: false`, `jsxSingleQuote: false`).
- Tests: Vitest in Node env; tests are colocated next to sources as `*.test.ts` or `*.spec.ts`.
- Hooks: Husky + lint-staged.
  - `pre-commit`: lints and formats staged files.
  - `commit-msg`: Conventional Commits via commitlint.

Scripts (root)

- `pnpm build`: build the current workspace (per package, use `--filter`).
- `pnpm -w build`: build all workspaces.
- `pnpm lint` / `pnpm lint:fix`: run ESLint.
- `pnpm format` / `pnpm format:fix`: check/apply Prettier.
- `pnpm test` / `pnpm test:watch`: run Vitest once/in watch mode.

Testing Conventions

- Tests must be colocated with the code under test.
- Examples:
  - `packages/core/src/index.ts` → `packages/core/src/index.test.ts`
  - `apps/api/src/routes/health.ts` → `apps/api/src/routes/health.test.ts`
  - See `AGENTS.md` for detailed conventions.

MVP Roadmap (Slices)

- Project Management: seed schema + commands to create/update/select projects.
  - File: `mvp_roadmap/Project Management 261ae4aa3620806d929df43e8bc73dc9.md`
- Config: system key/value store exposed via CLI/API.
  - File: `mvp_roadmap/Config Slice 262ae4aa36208070ae61e8d39b250916.md`
- Secrets: encrypted key/value with envelope encryption; masking by default.
  - File: `mvp_roadmap/Secrets Slice 262ae4aa3620800cb44bdfd2a8e56a55.md`
- Provider Profiles: non-secret provider config + links to secrets; resolve credentials at runtime.
  - File: `mvp_roadmap/Provider Slice 262ae4aa3620807db937cdb4c240712a.md`
- Schema Presets: reusable, versioned field definitions (storyboard/assets/citations/custom).
  - File: `mvp_roadmap/Schema Preset Slice 262ae4aa36208095b76cd4f36b9f4127.md`
- Script: pull/parse/diff script documents from providers; versioning + exports.
  - File: `mvp_roadmap/Script Slice 262ae4aa362080b7b382ef48065b4acc.md`
- Storyboard: materialized storyboard synced from Script; CRUD, presets, exports, provider apply.
  - File: `mvp_roadmap/Storyboard Slice 262ae4aa3620809db46eed1c1bc23008.md`
- Aux Tables: flexible per-project tables (assets/citations/custom) with presets and provider sync.
  - File: `mvp_roadmap/Aux Table Slice 262ae4aa362080f3a5e5e625d89e0d33.md`
- Runs: background job tracking (enqueue, claim, succeed/fail, idempotency) for pull/sync actions.
  - File: `mvp_roadmap/Run Table Slice 262ae4aa362080958c49eb5c1fc4db31.md`

Planned Stack Details

- Database: Drizzle ORM with SQLite (local CLI) and Postgres (API). Migrations and schemas land in `@sprongus/db`.
- Providers: Notion and CSV/Markdown first; profiles reference secrets in `SecretKV`.
- Sync: One-way Script → Storyboard, preserving extras and links; optional provider apply.
- Jobs: Long-running operations modeled as `Run`s and surfaced via CLI/API.

Local Environment

- `.env`: not required yet. Future: API will read DB/queue configuration via env and `ConfigKV`.
- Docker Compose: planned Postgres service (see roadmap). For now, the API runs without external deps.

Contributing

- Use Conventional Commits (enforced).
- Run `pnpm install` after cloning to set up Husky hooks.
- Before pushing, run: `pnpm -w lint && pnpm -w test`.

License

- MIT. See `LICENSE`.
