# AGENTS.md

# Sprongus • Agents & Maintainers Guide

This document orients AI coding assistants (e.g., Codex) and human contributors.

## Product North Star

- Focus: **narrative-driven video scripts** tightly coupled to **storyboard DB**.
- **Beat** is the atomic unit.
- **Script → Storyboard** is one-way: script is authoritative.

## Key Abstractions

### Providers

    export interface ProviderBlock {
      id: string;
      rawType: string;
      text: string;
      headingDepth?: number;
      indentLevel?: number;
      isListItem?: boolean;
      hasChildren: boolean;
      lastEdited: string;
      data?: unknown;
    }

### Script Style Parsers

    export interface ScriptStyleParser {
      id: string;
      parse(rootBlockId: string, provider: ScriptProvider, structurePreset: ScriptStructurePreset): Promise<ScriptDocument>;
    }

### Script Structure Presets

    export interface ScriptStructurePreset {
      label: string;
      id: string;
      levels: ScriptStructureLevel[];
    }

    export interface ScriptStructureLevel {
      label: string;
      data?: unknown;
    }

### Storage (SQLite)

Storyboard:

    CREATE TABLE IF NOT EXISTS storyboard (
      row_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      beat_id TEXT,
      idx INTEGER,
      beat_text TEXT,
      visual_description TEXT,
      extras TEXT
    );

Aux entries:

    CREATE TABLE IF NOT EXISTS aux_entries (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      table_name TEXT NOT NULL,
      payload TEXT,
      last_updated TEXT
    );

## Engineering Conventions

- TS strict mode
- Node 20+, pnpm
- SQLite (better-sqlite3)
- Zod validation
- Oclif CLI
- Vitest
- ESLint + Prettier

## Project Structure

    /packages/cli
    /packages/core
    /packages/providers/*
    /packages/exporters/*
    /fixtures

## Decision Guardrails

1. No storyboard → script feedback.
2. Providers are swappable.
3. Structures are user-chosen.
4. Schema flexibility first.
5. Deterministic syncs.

## Definition of Done

- Strict types, TSDoc
- Providers have setup docs + smoke test
- Syncs are idempotent
- Versioned migrations
- CLI commands have help text

## Common Tasks

### Add a Provider

- Parse source into ProviderBlock[]
- Support multiple styles
- Expose `getRootId`, `getChildren`, `getBlock`
- Provide fixtures

### Implement a Parser

- Map depth to structurePreset
- Flatten overflow gracefully
- Unit test multiple cases

### Storyboard Sync

- Diff beats ↔ rows
- Preserve metadata
- Idempotent runs

### Schema Presets

- Validate with Zod
- Save/load JSON or YAML

## Prompts for AI Helpers

- “Write a parser from ProviderBlock[] to ScriptDocument using a 3-level preset.”
- “Scaffold Oclif command `script export` with format and out flags.”
- “Create SQLite DDL for storyboard + aux_entries with indexes.”

## Gotchas

- Script is source of truth
- Don’t hard-code levels
- Local providers: caching optional

## Local Dev

    pnpm i
    pnpm build
    pnpm test
    pnpm lint
    pnpm link --global
    sprongus --help