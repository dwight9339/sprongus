# @sprongus/db

Database layer for Sprongus backed by Drizzle ORM. Ships both SQLite (CLI) and Postgres (API) support via separate migrations and repo implementations.

## Development

Install dependencies at the repo root:

```bash
pnpm install
```

### Running Tests

Tests auto-detect a reachable Postgres instance and wire the connection string via `scripts/run-tests.mjs`:

```bash
pnpm -F db test
```

If auto-detection fails, provide explicit hosts/credentials:

```bash
SPRONGUS_TEST_PG_HOSTS="my-host.example.com,172.17.0.1" pnpm -F db test
SPRONGUS_TEST_PG_URL="postgres://user:pass@host:5432/sprongus" pnpm -F db test
```

### Running Migrations

Drizzle configs are CommonJS so the CLI can `require` them. Keep `XDG_DATA_HOME` inside the workspace—Drizzle otherwise tries writing under `/home/node`, which is read-only in the Codespace container.

Postgres (requires compose or other Postgres instance):

```bash
cd packages/db
XDG_DATA_HOME="$PWD/.drizzle-data" \
SPRONGUS_DATABASE_URL="postgres://postgres:postgres@172.17.0.1:5432/sprongus" \
pnpm exec drizzle-kit migrate --config drizzle.config.pg.cjs
```

SQLite (writes to `tmp/sqlite-test.db`):

```bash
cd packages/db
XDG_DATA_HOME="$PWD/.drizzle-data" \
SPRONGUS_DB_PATH="$PWD/tmp/sqlite-test.db" \
pnpm exec drizzle-kit migrate --config drizzle.config.sqlite.cjs
```

Update `SPRONGUS_DATABASE_URL` / `SPRONGUS_DB_PATH` as needed to point at your instance.
