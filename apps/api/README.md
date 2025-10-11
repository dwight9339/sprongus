# @sprongus/api

Fastify REST API for Sprongus. The current surface area focuses on the ConfigKV slice and exposes CRUD operations for key/value settings.

## Running Locally

```bash
pnpm install
pnpm --filter @sprongus/api run build
pnpm --filter @sprongus/api run start
```

Environment variables (see `apps/api/src/env.ts`):

| Variable                                             | Description                                                                                                 | Default   |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------- |
| `PORT`                                               | HTTP port                                                                                                   | `3000`    |
| `HOST`                                               | Bind address                                                                                                | `0.0.0.0` |
| `DATABASE_URL`                                       | Postgres connection string. When omitted (or during tests) the API falls back to an in-memory SQLite store. | unset     |
| `REDIS_URL`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION` | Reserved for future slices.                                                                                 | unset     |

Health check: `GET /health` → `{ "ok": true }`

## Config Endpoints

All routes are prefixed with `/v1` and authenticated via config service wiring. Validation is performed with Zod and responses are JSON.

### `GET /v1/config`

List config entries.

Query parameters:

- `prefix` – optional string filter.
- `limit`, `offset` – optional pagination (non-negative integers).
- `includeValues` – `true`/`false` to include stored values.

Response `200`:

```json
[
  {
    "id": 1,
    "key": "app.debug",
    "value": true,
    "updatedAt": "2025-01-01T12:00:00.000Z"
  }
]
```

Errors: `400` for invalid query params.

### `GET /v1/config/:key`

Fetch a single entry.

- `200` with `ConfigEntry` JSON when the key exists.
- `404` with `{ "error": "NotFound", "message": "…" }` when missing.

### `PUT /v1/config/:key`

Upsert an entry. Body: `{ "value": <json> }`

- `200` with the updated `ConfigEntry`.
- `400` when the key or payload fails validation.

### `DELETE /v1/config/:key`

Remove an entry. Idempotent.

- `204` on success.
- `400` on validation failure.

### `POST /v1/config:import`

Bulk import entries.

Body:

```json
{
  "data": {
    "feature.alpha": true,
    "feature.beta": { "enabled": false }
  },
  "mode": "merge" // optional, "merge" (default) or "replace"
}
```

- `200` with the sorted array of imported entries.
- `400` for invalid body payloads.

### `GET /v1/config:export`

Export entries as an object map. Supports the optional `prefix` query parameter.

- `200` with `{ "key": value }`.
- `400` for invalid options.

## Testing

The API is covered by Vitest using Fastify's `inject` helper. During tests we intentionally bypass `DATABASE_URL` and use the in-memory SQLite store for isolation.

Run the API tests:

```bash
pnpm --filter @sprongus/api exec vitest run
```
