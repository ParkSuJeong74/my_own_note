# Node creation API

## Purpose

Implement idempotent creation for `POST /v1/workspaces/{workspaceId}/nodes` using the canonical
block-document decision in ADR 0007.

## Requirements

- Only `OWNER` and `EDITOR` members can create nodes; `VIEWER` receives `FORBIDDEN`.
- Requests use the shared strict contract: UUID operation/node IDs, `FOLDER` or `PAGE`, normalized
  non-empty title, nullable parent UUID, and non-negative safe integer position.
- A parent must be an active folder in the same authorized workspace. Invalid parents return
  `INVALID_REQUEST` without revealing content in another workspace.
- Page creation atomically writes the node, an empty schema-version-1 block document, immutable
  revision 1, and a workspace revision increment. Folder creation writes no document.
- `operationId` is persisted with the node. An identical retry returns the original result without
  another revision increment. Reuse with a different payload returns `OPERATION_REPLAY_MISMATCH`.
- A client node-ID collision returns `INVALID_REQUEST` and never overwrites data.

## Schema impact

Migration `0003_block_documents.sql` adds the creation operation to nodes plus current block documents
and immutable block-document revisions. Content uses validated JSONB, and SHA-256 covers the
deterministic canonical JSON representation. `CREATE` is recorded as the initial revision reason.

## Verification

- Handler tests cover successful page creation, malformed JSON/contracts, forbidden writes, invalid
  parents, replay mismatch, and safe storage failures.
- Repository tests cover transaction boundaries, page/document/revision atomicity, folder behavior,
  identical retries, and rollback.
- The complete workspace tests, builds, Cloudflare build, and browser E2E remain green.

