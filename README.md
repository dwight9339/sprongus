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

Environment

- Copy `.env.example` to `.env` and adjust as needed for local services.
- `docker compose up -d` starts Postgres, Redis, and MinIO for development.
- In the Dev Container, the container is attached to the same Docker network (`sprongus_net`). Use service hostnames:
  - `DATABASE_URL=postgres://postgres:postgres@postgres:5432/sprongus`
  - `REDIS_URL=redis://redis:6379`
  - `S3_ENDPOINT=http://minio:9000`

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
- `docs/mvp_roadmap/`: Planning docs for each slice (links below).

Development

- TypeScript: ESM across workspaces; sources in `src/`, build output in `dist/`.
- Linting: ESLint flat config with `@eslint/js` + `typescript-eslint` (type-aware) and `eslint-config-prettier`.
- Formatting: Prettier with double quotes (`singleQuote: false`, `jsxSingleQuote: false`).
- Tests: Vitest in Node env; tests are colocated next to sources as `*.test.ts` or `*.spec.ts`.
- Hooks: Husky + lint-staged.
  - `pre-commit`: lints and formats staged files.
  - `commit-msg`: Conventional Commits via commitlint.
  - Tests run on commit to catch regressions.

CI & Releases

- CI (GitHub Actions): installs deps, lints, typechecks, builds, and tests on PRs.
- Changesets: versioning and release PRs. Use `pnpm changeset` to create changesets.

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
  - Doc: [docs/mvp_roadmap/06_Project_Management.md](docs/mvp_roadmap/06_Project_Management.md)
- Config: system key/value store exposed via CLI/API.
  - Doc: [docs/mvp_roadmap/01_Config_Slice.md](docs/mvp_roadmap/01_Config_Slice.md)
- Secrets: encrypted key/value with envelope encryption; masking by default.
  - Doc: [docs/mvp_roadmap/02_Secrets_Slice.md](docs/mvp_roadmap/02_Secrets_Slice.md)
- Provider Profiles: non-secret provider config + links to secrets; resolve credentials at runtime.
  - Doc: [docs/mvp_roadmap/03_Provider_Slice.md](docs/mvp_roadmap/03_Provider_Slice.md)
- Schema Presets: reusable, versioned field definitions (storyboard/assets/citations/custom).
  - Doc: [docs/mvp_roadmap/04_Schema_Preset_Slice.md](docs/mvp_roadmap/04_Schema_Preset_Slice.md)
- Script: pull/parse/diff script documents from providers; versioning + exports.
  - Doc: [docs/mvp_roadmap/07_Script_Slice.md](docs/mvp_roadmap/07_Script_Slice.md)
- Storyboard: materialized storyboard synced from Script; CRUD, presets, exports, provider apply.
  - Doc: [docs/mvp_roadmap/08_Storyboard_Slice.md](docs/mvp_roadmap/08_Storyboard_Slice.md)
- Aux Tables: flexible per-project tables (assets/citations/custom) with presets and provider sync.
  - Doc: [docs/mvp_roadmap/09_Aux_Table_Slice.md](docs/mvp_roadmap/09_Aux_Table_Slice.md)
- Runs: background job tracking (enqueue, claim, succeed/fail, idempotency) for pull/sync actions.
  - Doc: [docs/mvp_roadmap/05_Run_Table_Slice.md](docs/mvp_roadmap/05_Run_Table_Slice.md)

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
