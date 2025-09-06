# Run Table Slice

Status: Not started
Area: API, CLI, Core, DB
Docs: DB Table Schemas (https://www.notion.so/DB-Table-Schemas-262ae4aa36208003a16aeb5ef54427e6?pvs=21)

## Summary

Add a system-level `Run` model to track background/long-running jobs across CLI and API (e.g., script.pull, sync.storyboard). Supports idempotent enqueueing, state transitions, basic retry metadata, and result references. Expose CRUD-ish read endpoints and “enqueue/cancel” actions; workers update status.

Runtime model:

- CLI: records runs in local SQLite for local operations.
- API: persists runs in Postgres; remote enqueue returns a run id the CLI can tail via `--remote`.

## Scope

- DB: Create `Run` table with portable columns; JSON `input` (TEXT in SQLite, JSONB in Postgres), indexes for query patterns, optional lightweight retry/attempt fields.
- Core: State machine + validation; idempotency guard; helpers to emit events.
- CLI: Commands to enqueue, check status, list/filter, and cancel runs (with `-remote` support).
- API: Endpoints to create (enqueue), read, list, and cancel; idempotency via `Idempotency-Key`.
- Worker: Poll queue, claim runs, write heartbeats, update final status, store `outputRef` or `error`.

## Model Notes

- Columns:
  - `id` (text PK ULID/CUID)
  - `projectId` (text, nullable for system runs)
  - `kind` (text; e.g. "script.pull", "sync.storyboard")
  - `input` (SQLite: TEXT JSON; Postgres: JSONB)
  - `outputRef` (text, nullable) — pointer to blob/artifact/log
  - `error` (text, nullable) — truncated message/stack
  - `state` (text enum): queued | running | succeeded | failed | canceled
  - `idempotencyKey` (text, unique nullable)
  - `attempt` (int, default 0)
  - `maxAttempts` (int, default 1 or 3)
  - `claimedBy` (text, nullable) — worker id
  - `claimedAt` / `startedAt` / `finishedAt` (timestamps, nullable)
  - `createdAt` / `updatedAt` (timestamps)
- Indexes:
  - `(projectId, createdAt DESC)`
  - `(state, createdAt DESC)`
  - `(kind, createdAt DESC)`
  - Unique on `idempotencyKey` (nullable)
- Retention:
  - Soft-retain last N days; optional cleanup job (out of scope to implement, but add column plan if needed later).

## To-Do (DB)

- [ ] Define `Run` schema in Drizzle with columns above.
- [ ] SQLite migrations:
- `input` as TEXT; timestamps as ISO strings; indices as noted.
- [ ] Postgres migrations:
- `input` as JSONB; optional partial index for `state <> 'succeeded'`; text enum (or CHECK) for `state`.
- [ ] Add FK constraint for `projectId` if `Project` table exists (defer if not in this PR).
- [ ] Cross-dialect migration tests (create/insert/query/indexes/unique idempotency).

## To-Do (Core)

- [ ] Zod enums/schemas: `RunKind`, `RunState`, `RunInput` (generic record).
- [ ] Implement `RunsService`:
- `enqueue({ projectId?, kind, input, idempotencyKey?, maxAttempts? })`
- `claimNext({ workerId, kinds?, limit? })` — marks queued → running (atomic)
- `heartbeat({ id, workerId })` — optional
- `succeed({ id, outputRef? })`
- `fail({ id, error, retryable? })` — increments `attempt` if retryable and `< maxAttempts`
- `cancel({ id })` — allowed only if queued|running with guard
- `get(id)` / `list(filters)` — filters: projectId, state, kind, since/before
- `ensureIdempotent(idempotencyKey, factory)` — helper to guard duplicate runs
- [ ] Emit domain events: `run.enqueued`, `run.started`, `run.succeeded`, `run.failed`, `run.canceled`.
- [ ] Map `input` JSON consistently (stringify on SQLite, pass-through on pg).
- [ ] Truncate `error` columns safely (e.g., 8–16KB cap).

## To-Do (CLI)

- [ ] `sprongus runs enqueue <kind> [--project <id>] [--input <json>|--stdin] [--idempotency-key <k>]`
- [ ] `sprongus runs status <id>`
- [ ] `sprongus runs list [--project <id>] [--state <s>] [--kind <k>] [--limit <n>] [--since <ISO>] [--json]`
- [ ] `sprongus runs cancel <id>` (confirm prompt)
- [ ] `sprongus runs tail <id>` (polls status; prints final outputRef/error)
- [ ] Add `--remote` support for all (default from `SPRONGUS_API_URL`); unit/e2e tests (local SQLite + mock API).

## To-Do (API)

- [ ] Routes under `/v1/runs`:
- `POST /v1/runs` → enqueue (uses `Idempotency-Key` header)
- `GET /v1/runs` → list with filters/pagination/sorting
- `GET /v1/runs/:id` → details
- `POST /v1/runs/:id:cancel` → cancel
- [ ] Worker endpoints (if workers are external):
- `POST /v1/runs:claim` → returns batch to a worker id
- `POST /v1/runs/:id:heartbeat`
- `POST /v1/runs/:id:succeed` / `:fail`
- [ ] Zod request/response validation; error normalization
- [ ] Auth scopes: `runs:read`, `runs:write`; project authorization checks
- [ ] Rate-limit enqueue/cancel; pagination caps (e.g., 100 per page)

## To-Do (Worker)

- [ ] Implement worker loop:
- claim → execute → succeed/fail; respect `maxAttempts` + backoff (exponential jitter)
- [ ] Structured logs per run id; include timing metrics
- [ ] Optional: heartbeat while running to detect stalled jobs

## To-Do (Security & Ops)

- [ ] Disallow secrets in `input`; pass secret refs only (resolved at execution time)
- [ ] Redact PII in logs; cap error sizes; avoid logging full `input` by default
- [ ] Observability: trace span per run; metrics for queue depth, latency, success rate
- [ ] Cleanup policy doc (e.g., delete succeeded runs after 30 days; keep failures 90 days)

## To-Do (Tests & Docs)

- [ ] Migration tests (SQLite + Postgres)
- [ ] Core unit tests:
- enqueue idempotency (same key returns same run)
- state transitions (valid/invalid)
- retry path with `maxAttempts`
- [ ] CLI e2e: enqueue → status → tail; cancel flow
- [ ] API e2e: supertest for all endpoints incl. Idempotency-Key behavior
- [ ] Worker integration test: claim/execute/report; simulate failure + retry
- [ ] Docs:
- README section: run lifecycle, states, idempotency
- API OpenAPI entries; CLI usage examples

## DoD

- [ ] `Run` table migrates on SQLite and Postgres with indexes and idempotency unique constraint
- [ ] `RunsService` enforces state machine and idempotency; unit tests green
- [ ] CLI can enqueue, list, status, tail, and cancel locally and with `-remote`
- [ ] API exposes validated endpoints with pagination and rate limiting; idempotency works
- [ ] Worker executes jobs and records outcomes with retries where allowed
- [ ] Docs updated with lifecycle diagrams and examples
