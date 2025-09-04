# Set Up the Monorepo

Status: In progress
Area: Infra

## Summary

We need to initialize the pnpm monorepo for the project.

## Scope

Set up the root workspace and stub out initial workspaces (apps + packages). Configure QA infra (linting, style checking, unit tests, commit quality), dev containers, and Docker Compose for local services. Add CI workflows and basic project hygiene (env management, docs, licensing, release/versioning).

## To-Do

- [x] Devcontainer: .devcontainer/devcontainer.json with Node 20+, pnpm, and extensions
- [x] Create monorepo structure: /apps (cli, api), /packages (core, db, shared)
- [x] Add pnpm-workspace.yaml and root package.json with scripts (build, test, lint, format)
- [x] Choose & configure linter/formatter (ESLint + Prettier or Biome) with root config and ignore files
- [x] Add commit hooks (Husky + lint-staged) to run lint/format/test on staged files
- [x] Add conventional commits tooling (commitlint + config-conventional) or commitizen
- [x] Configure TypeScript: tsconfig.base.json + per-workspace tsconfig; enable project references
- [x] Set up unit testing (Vitest) with a minimal example test in one workspace
- [x] Add .gitattributes
- [x] Add root README with monorepo overview and contribution notes
- [x] Add CI (GitHub Actions): node setup + pnpm cache, install, lint, typecheck, test on PRs
- [x] Add release/versioning (Changesets) with a basic config and a placeholder changeset
- [x] Add CI (optional): release workflow using Changesets on main
- [x] Add LICENSE
- [x] Add .env.example and (optionally) dotenv-safe or env-var validation in apps
- [x] Docker Compose: postgres
- [x] Wire api app to read env for DB/Redis/S3 endpoints; cli app stays local-first

## DoD

- [x] `pnpm -v` and `pnpm install` succeed at repo root; workspace hoisting works
- [x] `pnpm -w build`, `pnpm -w lint`, `pnpm -w test` run successfully and touch at least one app + one package
- [x] Pre-commit hooks run lint/format/tests on staged files
- [x] CI pipeline passes on a fresh PR (install → lint → typecheck → test)
- [ ] `docker compose up -d` brings up postgres, redis, minio and healthchecks pass
- [ ] Devcontainer opens with pnpm and Node configured; repo scripts work inside the container
- [ ] Changesets is initialized and can produce a version PR when triggered
- [ ] Root README documents workspace layout, scripts, and local env setup (including .env.example)
