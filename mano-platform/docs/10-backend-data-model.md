# Backend data model

## Purpose

Define the first server-owned data model for authenticated personal notes before API routes,
migrations or synchronization code are implemented. This model covers `EDT-002`, `EDT-003`,
`EDT-004`, `EDT-013`, `EDT-028`, `REL-001`, `REL-005` and `REL-013`.

## Verified starting point

- `mano-admin` has no local user/password account table. Cloudflare Access validates a dedicated
  application JWT and currently forwards the allowed email to Admin routes.
- The Admin schema contains historical `workspace_pages` and `workspace_blocks`, but those records
  have no workspace ownership boundary. Mano Platform must not read that database directly.
- Mano Platform currently stores a folder/page tree, one Markdown-like text body per page, local
  revisions and view state in browser storage.
- The platform repository must remain independently extractable. Integration with Admin is an
  identity adapter or migration input, never a runtime source-code or database dependency.

## Ownership boundary

PostgreSQL is the authoritative server store for durable Mano content. Mano Platform owns its schema
and database credentials. `mano-admin` and Mano Platform may use the same PostgreSQL server, but use
separate databases or roles; neither service receives unrestricted access to the other's tables.

Cloudflare Access authenticates the pilot. The API verifies `Cf-Access-Jwt-Assertion` itself and maps
the tuple `(issuer, subject)` to a Mano principal. Email is retained as a mutable display/contact
attribute, not used as a foreign key. A dedicated Access application and audience are required for
Mano Platform; the Admin audience is not reused.

## Entity relationship

```text
identity_principals 1──* workspace_members *──1 workspaces
                                             │
                                             ├──* nodes (folder/page tree)
                                             │     └──0..1 documents
                                             │              └──* document_revisions
                                             ├──* client_devices
                                             │     └──* sync_operations
                                             └──* attachments
```

## Tables

### `identity_principals`

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key, server generated |
| `issuer` | `text` | Normalized Access issuer URL |
| `subject` | `text` | Stable JWT subject; never email |
| `email` | `citext` | Latest verified email |
| `display_name` | `text` | Optional user-facing name |
| `created_at`, `updated_at` | `timestamptz` | Server timestamps |
| `disabled_at` | `timestamptz` | Nullable account disable marker |

Unique: `(issuer, subject)`. Email changes update the existing principal after subject verification.

### `workspaces`

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `name` | `text` | Non-empty, maximum 200 characters |
| `kind` | `text` | Initially `PERSONAL`; later `SHARED` |
| `created_at`, `updated_at` | `timestamptz` | Server timestamps |
| `archived_at` | `timestamptz` | Nullable |

The first successful pilot login transaction creates one personal workspace and an owner membership.

### `workspace_members`

Composite primary key: `(workspace_id, principal_id)`. Role is `OWNER`, `EDITOR` or `VIEWER`.
All content authorization begins with this relation; knowing a node UUID never grants access.

### `nodes`

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Client-generated UUID accepted for offline creation |
| `workspace_id` | `uuid` | Required ownership boundary |
| `parent_id` | `uuid` | Nullable self-reference |
| `kind` | `text` | `FOLDER` or `PAGE` |
| `title` | `text` | Trimmed, non-empty, maximum 500 characters |
| `position` | `bigint` | Sibling ordering value |
| `revision` | `bigint` | Starts at 1, increments on metadata mutation |
| `archived_at` | `timestamptz` | Non-destructive archive |
| `trashed_at` | `timestamptz` | Recoverable trash |
| `purge_after` | `timestamptz` | Nullable retention deadline |
| `created_at`, `updated_at` | `timestamptz` | Server timestamps |

Parent and child must belong to the same workspace. A page cannot be a parent in the initial model.
Cycles are rejected transactionally. Sibling titles are intentionally not unique; references resolve
only when an active page title has exactly one match. Permanent deletion is a controlled purge job,
not a normal client delete request.

### `documents`

One row per page node.

| Column | Type | Rules |
| --- | --- | --- |
| `page_id` | `uuid` | Primary/foreign key to a `PAGE` node |
| `workspace_id` | `uuid` | Repeated for authorization and indexing |
| `markdown_text` | `text` | Canonical document source |
| `revision` | `bigint` | Starts at 1; optimistic concurrency token |
| `content_hash` | `bytea` | SHA-256 for deduplication/integrity |
| `created_at`, `updated_at` | `timestamptz` | Server timestamps |

Markdown text is the first server contract. The current browser `DocumentState` is an adapter around
this source, not the wire/storage schema. Rich block tables require a later ADR and migration.

### `document_revisions`

Immutable snapshots with `(page_id, revision)` unique. Each row stores `markdown_text`,
`content_hash`, `created_by`, `operation_id`, `created_at` and a reason (`EDIT`, `RESTORE`, `IMPORT`).
A restore writes a new document revision; it never rewrites or deletes later history. Identical
content hashes do not create duplicate revisions.

### `client_devices`

Stores a random installation UUID scoped to a principal, optional label, first/last seen timestamps
and revocation time. It is not a trusted authentication credential.

### `sync_operations`

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Client-generated idempotency key |
| `workspace_id` | `uuid` | Authorization boundary |
| `device_id` | `uuid` | Originating installation |
| `entity_type`, `entity_id` | text/uuid | Mutation target |
| `operation_type` | `text` | Versioned allow-listed operation |
| `base_revision` | `bigint` | Client revision before mutation |
| `payload` | `jsonb` | Validated operation-specific data |
| `status` | `text` | `APPLIED`, `CONFLICT` or `REJECTED` |
| `result_revision` | `bigint` | Nullable resulting revision |
| `created_at`, `processed_at` | `timestamptz` | Client/server timing |

Unique `(workspace_id, id)` makes retries idempotent. A mismatched `base_revision` produces a conflict
record and current server representation; last-write-wins is not implicit. Realtime transport is
only notification—successful database commit remains the source of truth.

### `attachments`

Metadata only: workspace/page ownership, object key, original filename, media type, byte size,
SHA-256, upload state, scan state, creator and lifecycle timestamps. File bytes live in S3-compatible
object storage under a non-guessable server-generated key. Downloads require authorization and use
short-lived signed URLs. Initial API work does not enable attachments until quota, scanning, backup
and orphan cleanup are implemented.

## Derived indexes

Tags, `[[references]]`, backlinks and basic search are derived from `markdown_text`. Initially they
can be recomputed in the write transaction or background job into `document_tags` and
`document_links`. Derived rows are disposable and never the only copy of user content. Ambiguous
titles remain unresolved. PostgreSQL full-text/trigram search is preferred before an external engine.

## Invariants and deletion

- Every query and unique/index key that can cross tenants includes `workspace_id`.
- API repositories require an authorized membership before loading content.
- Folder trash/archive applies to descendants in one transaction or a resumable operation with an
  explicit incomplete state; partial success is never reported as complete.
- Normal deletion sets `trashed_at`. Purge requires retention expiry or a separately confirmed user
  action and records an audit event before removing content and object files.
- Database backups include schema, content, revisions and attachment metadata; object storage has an
  independently verified backup and restore procedure.

## Local-data migration

1. Export and validate the current versioned JSON backup locally.
2. Authenticate and create/find the personal workspace.
3. Allocate server UUIDs for legacy prefixed IDs and build an old-to-new ID map.
4. Upload folders before child nodes, then pages and Markdown source, in one idempotent import job.
5. Compare active/trash node counts, body hashes and parent relationships.
6. Keep browser data and the JSON backup until the server copy is re-downloaded and verified.
7. Mark the origin and import job ID; repeated upload returns the existing result.

View state (open tabs, split sizes, cursor and collapsed folders) remains device-local initially and
is not part of the first server migration.

## API implementation order

1. Access JWT verification and `/v1/me` bootstrap.
2. Workspace membership authorization middleware.
3. Tree snapshot read and idempotent node mutations.
4. Document read/update with `baseRevision` and immutable revision creation.
5. Local JSON import with dry-run validation and reconciliation report.
6. Incremental operation push/pull and explicit conflict responses.
7. Derived tags, references and search.
8. Attachments only after storage policy is accepted.

## Verification before implementation

- Schema tests prove cross-workspace parent/document references are rejected.
- Authorization tests prove a valid identity cannot enumerate another workspace.
- Concurrent updates deterministically return one success and one conflict.
- Retried operation IDs do not duplicate nodes or revisions.
- Restore creates a higher revision and preserves the restored-from and newer snapshots.
- Import dry-run makes no writes; committed import reconciles IDs, counts and hashes.
- Backup restoration is tested against both PostgreSQL and object metadata before production use.

