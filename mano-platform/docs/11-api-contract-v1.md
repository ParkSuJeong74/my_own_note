# API contract v1

## Purpose

Define the first authenticated Mano HTTP contract before choosing an API framework or database
library. The contract implements the initial slices of `EDT-002`, `EDT-003`, `EDT-004`, `EDT-028`,
`REL-001` and `REL-013` against the model in `docs/10-backend-data-model.md`.

## General rules

- Base path is `/v1`; request and response bodies use JSON UTF-8.
- Authentication is a verified Cloudflare Access application JWT. The client never supplies a
  principal or workspace owner ID to gain access.
- UUID values use canonical hyphenated RFC 4122 text. Timestamps use UTC ISO 8601 strings.
- Every mutation includes `operationId`. Retrying the same operation returns its original outcome.
- Mutable resources expose a positive integer `revision`. Updates include `baseRevision`.
- Unknown object properties are rejected on mutation requests so misspelled fields cannot disappear.
- Limits are measured before database work: title 500 characters, block text 1 MiB UTF-8,
  block document 5 MiB JSON and 10,000 blocks,
  mutation batches 100 operations and list page size 100.

## Error envelope

```json
{
  "error": {
    "code": "DOCUMENT_CONFLICT",
    "message": "Document changed on another device.",
    "requestId": "01J...",
    "retryable": false,
    "details": {}
  }
}
```

Supported initial codes: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `METHOD_NOT_ALLOWED`, `INVALID_REQUEST`,
`OPERATION_REPLAY_MISMATCH`, `NODE_CONFLICT`, `DOCUMENT_CONFLICT`, `RATE_LIMITED`,
`STORAGE_UNAVAILABLE` and `INTERNAL_ERROR`. Messages are safe for users and never contain SQL,
tokens, stack traces or raw request bodies.

## Identity bootstrap

### `GET /v1/me`

Creates the pilot principal/personal workspace transactionally on first use and otherwise returns the
existing mapping.

```json
{
  "principal": { "id": "uuid", "email": "verified@example.com", "displayName": null },
  "workspaces": [{ "id": "uuid", "name": "내 워크스페이스", "kind": "PERSONAL", "role": "OWNER" }]
}
```

## Tree

### `GET /v1/workspaces/{workspaceId}/tree`

Returns one consistent tree snapshot with `workspaceRevision`, active and trashed nodes. Documents
are not embedded. Conditional requests may use an ETag derived from the workspace revision.

### `POST /v1/workspaces/{workspaceId}/nodes`

Creates a page or folder using a client UUID.

```json
{
  "operationId": "uuid",
  "id": "uuid",
  "kind": "PAGE",
  "title": "제목 없음",
  "parentId": null,
  "position": 1024
}
```

Creating a page atomically creates its empty document at revision 1. A folder cannot receive a
document. IDs already owned by another operation are rejected.

### `PATCH /v1/workspaces/{workspaceId}/nodes/{nodeId}`

Accepts `operationId`, `baseRevision` and at least one of `title`, `parentId`, `position`,
`archived` or `trashed`. Parent changes validate workspace, node kind and cycles in one transaction.
A stale revision returns HTTP 409 with `NODE_CONFLICT` and the current node representation.

Permanent purge is deliberately absent from v1 until retention, audit and backup restore exist.

## Documents and revisions

### `GET /v1/workspaces/{workspaceId}/pages/{pageId}/document`

Returns `pageId`, `schemaVersion`, `blocks`, `revision`, `contentHash` and `updatedAt`. A folder ID returns 404 rather
than a synthetic document.

### `PUT /v1/workspaces/{workspaceId}/pages/{pageId}/document`

```json
{
  "operationId": "uuid",
  "baseRevision": 7,
  "schemaVersion": 1,
  "blocks": [
    { "id": "uuid", "type": "heading", "level": 1, "text": "제목" },
    { "id": "uuid", "type": "checklist", "checked": false, "text": "할 일" }
  ]
}
```

The server validates block IDs, types and type-specific properties, locks the document, verifies the base revision, writes the current row and immutable
revision in one transaction, then returns revision 8. Identical content returns the current document
without incrementing revision. A stale base returns HTTP 409 with `DOCUMENT_CONFLICT`, the current
document and the rejected base revision; it never silently overwrites.

### `GET /v1/workspaces/{workspaceId}/pages/{pageId}/revisions`

Returns newest-first metadata with opaque cursor pagination. Snapshot text is loaded through
`GET .../revisions/{revision}` so history lists do not transfer every body.

### `POST /v1/workspaces/{workspaceId}/pages/{pageId}/revisions/{revision}/restore`

Requires `operationId` and current `baseRevision`. Restore copies the selected snapshot into a new
higher revision with reason `RESTORE`; no history row is mutated.

## Synchronization

### `POST /v1/workspaces/{workspaceId}/sync/push`

Accepts 1–100 allow-listed operations in device sequence order. Each operation has an independent
result (`APPLIED`, `CONFLICT`, `REJECTED`) and the batch does not claim atomic success across unrelated
documents. Reusing an operation ID with different type/entity/payload returns
`OPERATION_REPLAY_MISMATCH`.

### `GET /v1/workspaces/{workspaceId}/sync/pull?cursor=...&limit=...`

Returns authorized committed changes in stable server sequence order plus `nextCursor` and
`hasMore`. Cursors are opaque. Clients persist the next cursor only after applying the full response
locally. Realtime messages only prompt this pull; they do not carry authoritative content.

## Import boundary

The first migration endpoint accepts the existing validated Mano JSON backup as an explicit import
job. Dry-run returns mapping/count/hash diagnostics without writes. Commit requires the dry-run token
and an `operationId`; retry returns the same import report. Import never merges by page title.

## Contract verification

- Runtime validators reject malformed UUIDs, empty/long titles, invalid enums, non-positive revisions,
  oversized block documents, duplicate block IDs and unknown mutation properties.
- Contract tests cover normal requests, minimum/maximum boundaries, stale revisions and replay shape.
- API integration tests later prove JWT failure is closed, workspace isolation, transactional page
  creation, idempotency and conflict envelopes.
- Generated OpenAPI can be added only after it is derived from or checked against these contracts;
  it must not become a divergent handwritten copy.
