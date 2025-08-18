# MVP Plan

## Overview
The goal is to ship a minimum viable version of Sprongus that lets a user:
- configure a Notion project via the CLI
- pull the project script into a local SQLite cache
- synchronise beats with a storyboard database
- export the script as Markdown

## Current State
- **Core package** contains type definitions and SQLite helpers but several modules (e.g. Notion providers, storyboard sync) contain TODOs or stubs.
- **CLI package** scaffolds commands for project management and storyboard sync but imports from `@sprongus/core` are incomplete.
- Only placeholder tests exist for the CLI; config module tests run in the core package.

## Tasks to Reach MVP

### 1. Provider Implementations
- Finish `NotionScriptProvider` methods (`getScriptBlockId`, `listChildren`, etc.).
- Implement storyboard and aux-table providers for Notion with read/write capabilities.
- Document provider setup including required Notion token and database structure.

### 2. Script Parsing & Structure
- Implement a basic style parser that turns provider blocks into a `ScriptDocument` using a three-level preset.
- Support preset loading via config and validate with Zod.

### 3. Local Cache
- Flesh out cache schemas for projects, scripts, storyboards, and aux tables; add migrations.
- Expose CRUD helpers (`getProjectByAlias`, `listStoryboardRows`, etc.) and write tests.

### 4. Storyboard Sync
- Replace the stubbed `syncStoryboard` with logic that diffs beats against storyboard rows, creates/updates rows, and keeps runs idempotent.
- Ensure script beats record the `storyboardRowId` for round‑trip editing.

### 5. CLI Workflow
- Wire CLI commands to core APIs: `project fetch`, `script pull`, `sync storyboard`, and `script export`.
- Provide `--help` text and examples for each command.

### 6. Exporters
- Implement a Markdown exporter that reads from the cached script and writes to disk.
- Add fixtures and tests for the exporter.

### 7. Testing & Quality
- Add unit tests for providers, cache operations, parser, and sync logic (Vitest).
- Lint the workspace and enable type‑checking in CI.

### 8. Documentation
- Update README with setup steps, provider docs, and example workflows.
- Provide smoke‑test instructions for each provider.

## Stretch Goals (post‑MVP)
- Additional providers (Markdown, Google Docs).
- Alternative exporters (FDX, PDF, CSV).
- Webhook or UI integrations.
