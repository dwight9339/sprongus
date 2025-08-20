# Roadmap

| Area | Description | Status |
| ---- | ----------- | ------ |
| Providers | Finish `NotionScriptProvider` methods (`getScriptBlockId`, `listChildren`, etc.) | In progress |
| Providers | Implement Notion storyboard provider with read/write | Planned |
| Providers | Implement Notion aux-table provider with read/write | Planned |
| Providers | Document provider setup and required Notion token/database | Planned |
| Script Parsing & Structure | Implement style parser converting provider blocks to `ScriptDocument` using three-level preset | Planned |
| Script Parsing & Structure | Support preset loading via config and validate with Zod | Planned |
| Local Cache | Flesh out cache schemas for projects, scripts, storyboards, and aux tables; add migrations | Planned |
| Local Cache | Expose CRUD helpers (e.g., `getProjectByAlias`, `listStoryboardRows`) and tests | Planned |
| Storyboard Sync | Replace stubbed sync with diffing beats against storyboard rows and idempotent updates | Planned |
| Storyboard Sync | Record `storyboardRowId` on synced beats | Planned |
| CLI Workflow | Wire CLI commands to core APIs (`project fetch`, `script pull`, `sync storyboard`, `script export`) | Planned |
| CLI Workflow | Provide `--help` text and examples for each command | Planned |
| Exporters | Implement Markdown exporter reading from cached script and writing to disk | Planned |
| Exporters | Add fixtures and tests for Markdown exporter | Planned |
| Testing & Quality | Add unit tests for providers, cache operations, parser, and sync logic | Planned |
| Testing & Quality | Lint workspace and enable type checking in CI | Planned |
| Documentation | Update README with setup steps, provider docs, and example workflows | Planned |
| Documentation | Provide smoke-test instructions for each provider | Planned |
