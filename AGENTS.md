# Agent Conventions

This project uses a monorepo layout with packages under `packages/` and apps under `apps/`.

## Unit Test Colocation

- Tests must be colocated with the source they cover.
- Name tests `*.test.ts` or `*.spec.ts` and place them next to the file under test.
- Vitest is configured to discover all `**/*.{test,spec}.ts` files.

Examples

- `packages/core/src/index.ts` → `packages/core/src/index.test.ts`
- `packages/db/src/client.ts` → `packages/db/src/client.test.ts`
- `apps/api/src/routes/health.ts` → `apps/api/src/routes/health.test.ts`
- `apps/cli/src/commands/hello.ts` → `apps/cli/src/commands/hello.test.ts`

Notes

- Do not create separate `test/` directories.
- Prefer small, focused tests that exercise public APIs.
- Use Vitest’s standard imports (`import {describe, it, expect} from 'vitest'`).

## TypeScript & Modules

- Use TypeScript with ESM (`"type": "module"`).
- Workspace `tsconfig.json` files extend the root `tsconfig.json`.
- Emit to `dist/` via `tsconfig.build.json`; keep sources in `src/`.
- Scripts:
  - Build: `tsc -p tsconfig.build.json`
  - Typecheck: `tsc -p tsconfig.build.json --noEmit`

## Linting & Formatting

- ESLint: flat config in `eslint.config.mjs` using `@eslint/js` + `typescript-eslint` (type-aware) + `eslint-config-prettier`.
- Prettier: configured for double quotes (`singleQuote: false`, `jsxSingleQuote: false`).
- Commands:
  - Lint: `pnpm lint` (fix: `pnpm lint:fix`)
  - Format: `pnpm format` (write: `pnpm format:fix`)
- Pre-commit runs `lint-staged` to auto-fix staged files.

## Commits & Hooks

- Conventional Commits enforced by commitlint.
- Hooks (Husky):
  - `pre-commit`: `pnpm lint-staged`
  - `commit-msg`: `pnpm exec commitlint --edit "$1"`
- Examples: `feat(core): add parse util`, `fix(api): handle 400 on bad input`.

## Workspaces & Scripts

- Packages (libraries) live in `packages/*` and should expose ESM builds from `dist/` with `exports` and `types`.
- Apps live in `apps/*` and should provide `start`, `build`, and `typecheck` scripts.
- Prefer named exports in libraries for tree-shaking and clarity.

## Adding a New Workspace

1. Create `packages/<name>/` or `apps/<name>/`.
2. Add `package.json` with `name`, `version`, `type: module`, `files: ["dist"]`, scripts (`build`, `typecheck`).
3. Add `tsconfig.json` (extends root) and `tsconfig.build.json`.
4. Add `src/index.ts` (or appropriate entry) and a colocated `*.test.ts`.
5. Install deps with `pnpm --filter <pkg> add <deps>`.

## Apps

- CLI (apps/cli): built with `@oclif/core`, entrypoint at `src/bin/run.ts`, commands under `src/commands/`.
- API (apps/api): Fastify server exposes `buildServer()`; put routes under `src/routes/` and register in `src/index.ts`.

## Database Package

- DB (packages/db): will house Drizzle ORM client and schema. Add `schema.ts`, `client.ts` and expose a typed client factory.

## CI Recommendations

- Suggested PR checks: `pnpm lint`, `pnpm test`, and minimal build smoke tests.
- Vitest config uses `pool: "vmThreads"` for sandbox compatibility; adjust to `threads` on CI if desired.

## Keep This Doc Updated

- When adding conventions (naming, release process, code style), update this file so contributors stay aligned.
