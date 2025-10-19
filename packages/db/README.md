# @sprongus/db

Database layer for Sprongus backed by Drizzle ORM. Ships both SQLite (CLI) and Postgres (API) support via separate migrations and repo implementations. The primary surface today is the **ConfigKV** store that backs feature flags and platform settings exposed through the CLI and API.

## Development

Install dependencies at the repo root:

```bash
pnpm install
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

### Running Tests

Tests cover both dialects:

- SQLite specs apply the SQL from `drizzle/sqlite` to an in-memory database before exercising the repository contract.
- Postgres specs now default to spinning up a disposable Postgres container via [Testcontainers](https://node.testcontainers.org/). If Docker is unavailable they fall back to auto-discovering an existing instance (using the same host resolution logic as before) and otherwise skip.

Typical workflow:

```bash
# Uses Testcontainers when Docker is reachable; otherwise falls back to host discovery.
pnpm -F db test
```

To point at a specific Postgres instance instead of Testcontainers, set either `SPRONGUS_TEST_PG_URL` or `SPRONGUS_TEST_PG_HOSTS`:

```bash
SPRONGUS_TEST_PG_URL="postgres://user:pass@host:5432/sprongus" pnpm -F db test
SPRONGUS_TEST_PG_HOSTS="my-host.example.com,172.17.0.1" pnpm -F db test
```
