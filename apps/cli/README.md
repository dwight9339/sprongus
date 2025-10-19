# @sprongus/cli

Sprongus command-line interface powered by [oclif](https://oclif.io/). The MVP ships a configuration workflow that lets you manage system-level key/value pairs locally (SQLite) or against the remote API.

## Installation & Build

From the repo root:

```bash
pnpm install
pnpm --filter @sprongus/cli run build
```

During development you can run commands directly from source via `pnpm --filter @sprongus/cli exec oclif`, but the examples below assume the compiled entrypoint:

```bash
node apps/cli/dist/bin/run.js --help
```

## Config Commands

All config subcommands are exposed under `sprongus config`. They support local and remote execution:

- **Local (default)**: stores data in a SQLite database under the OS config directory (override with `--db <path>` or `SPRONGUS_DB_PATH`).
- **Remote**: proxy through the API by providing `--remote <url>` or setting `SPRONGUS_API_URL`.

Every command accepts `--json` to emit machine-readable output.

| Command                                | Description                                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `sprongus config get <key>`            | Fetch a single entry. Prints the stored value or exits with code `1` if missing.                    |
| `sprongus config set <key> <value>`    | Upsert a value. Values are parsed as JSON when `--json` is supplied (otherwise treated as strings). |
| `sprongus config unset <key>`          | Remove an entry (idempotent).                                                                       |
| `sprongus config list`                 | List keys, optionally with values. Flags: `--prefix <str>`, `--values`.                             |
| `sprongus config import --file <path>` | Load a JSON object map. Modes: `--merge` (default) or `--replace`.                                  |
| `sprongus config export`               | Emit the current config map. Accepts `--prefix <str>`.                                              |

Examples:

```bash
# Use the default local SQLite store
node apps/cli/dist/bin/run.js config set app.debug true --json
node apps/cli/dist/bin/run.js config list --values

# Point at a custom db path
node apps/cli/dist/bin/run.js config import --file ./config.json --db ./tmp/config.db

# Delegate to a remote API
node apps/cli/dist/bin/run.js config export --remote http://localhost:3000 --prefix feature.
```

## Environment

- `SPRONGUS_DB_PATH`: override the local SQLite DB file.
- `SPRONGUS_API_URL`: default URL for `--remote` operations.
- `SPRONGUS_CONFIG_DIR`: (optional) customize the base directory where the SQLite file lives.

## Testing

Config commands are covered by Vitest in `apps/cli/src/commands/config/*.test.ts`. Run the suite with:

```bash
pnpm --filter @sprongus/cli exec vitest run
```
