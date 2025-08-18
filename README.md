# README.md

# Sprongus

**Sprongus** is a flexible utility for narrative video projects. It helps writers, editors, and producers manage **scripts**, **storyboards**, and **auxiliary production assets** with granular syncing, local caching, and export workflows—driven from a TypeScript CLI.

> Status: early alpha. Expect sharp edges while the core abstractions settle.

## Why Sprongus?

- Tight coupling between **script beats** and a **storyboard database** is the superpower.
- Pluggable providers let you **pull/push from different backends** (Notion, local Markdown, Google Docs planned).
- A local **SQLite cache** powers fast, offline-friendly workflows.
- Strong focus on **repeatable syncs** and **structured exports** for downstream tooling.

## Key Features

- Script syncing from external or local providers
- Storyboard management with beat-level alignment
- Aux tables for assets/citations and custom metadata
- Flexible script structures and style parsers
- SQLite-backed caching
- Exporters (txt/markdown now; FDX/PDF/CSV planned)
- Clean TypeScript CLI UX

## Quick Start

    pnpm install
    pnpm build
    pnpm link --global
    sprongus project new myVideo
    sprongus script pull myVideo
    sprongus sync storyboard myVideo
    sprongus script export myVideo --format markdown

## CLI Overview

    sprongus
      project new <alias>
      project details <project>
      project update <project>
      project remove <project>

      script pull <project>
      script push <project>
      script export <project>

      sync storyboard <project>
      sync script <project>

      schema save-preset

## Core Concepts

| Concept         | What it means                                                                 |
|-----------------|--------------------------------------------------------------------------------|
| Project         | Top-level unit with providers, script structure, schemas.                     |
| Script          | Tree or flat beats.                                                           |
| Provider        | Backend (Notion, Markdown, GDocs, etc.).                                      |
| Style Parser    | Parsing logic (nested lists, headings, etc.).                                 |
| Storyboard      | Rows keyed to beats, adds production metadata.                                |
| Aux Tables      | Assets, citations, or custom project tables.                                  |
| Schema Presets  | Extendable schemas in JSON/YAML.                                              |

## Architecture Highlights

- **Provider Registry** — pluggable backends
- **Script Structure Presets** — decouple structure from style
- **Script Style Parsers** — turn provider blocks into ScriptDocuments
- **Local Cache (SQLite)** — authoritative for CLI ops

## Development

Requirements:
- Node.js 20+
- pnpm

Scripts:
    pnpm build
    pnpm test
    pnpm lint
    pnpm dev

## Roadmap

- Webhooks
- UI frontend
- Google Docs / Markdown providers
- Exporters: FDX, PDF, CSV
- Collaboration: “Sprongus Sync”

## Contributing

Contributions welcome. Please add setup docs, type-safe config validation, and tests with new providers.

## License

MIT