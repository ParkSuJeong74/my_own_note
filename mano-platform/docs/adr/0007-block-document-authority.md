# ADR 0007 — Block documents as the canonical content model

## Status

Accepted. Supersedes only the Markdown document-storage decision in ADR 0006; its PostgreSQL,
identity, workspace ownership, revision, and backup decisions remain accepted.

## Context

Mano is intended to grow from notes into checklists, tables, media, databases, calendars, widgets,
and other structured tools. The existing editor core already models documents as stable ordered
blocks and provides immutable insert, update, convert, toggle, remove, and reorder commands. Storing
only Markdown on the server would discard block identity and force future structured features through
lossy text conventions.

## Decision

The canonical page body is a versioned block document. Every block has a stable UUID, explicit type,
ordered position, type-specific properties, and textual content where applicable. The first server
version supports `paragraph`, `heading`, and `checklist`; new types require versioned contracts and
migrations. Markdown is an import/export and interoperability format, not the database authority.

Current documents and immutable revision snapshots are stored as validated JSONB envelopes first.
Frequently queried metadata may later be projected into relational tables, but derived projections
cannot become the only copy. Whole-document optimistic revisions remain the initial conflict unit;
block-level operations and CRDT/OT require a later synchronization ADR.

## Consequences

- Block identity survives reordering, conversion, synchronization, and revision restore.
- Structured blocks can evolve without encoding their state into Markdown.
- JSONB schemas, size limits, migration versions, and canonical hashing must be strict.
- Concurrent edits to different blocks still conflict at document revision granularity initially.
- Markdown round trips may be lossy for blocks without a native Markdown representation and must
  report those losses before export/import is accepted.

## Migration and rollback

The current browser `DocumentState` already supplies the initial envelope. Legacy single-body pages
become one paragraph block with a generated UUID. A reversible exporter writes versioned JSON plus a
best-effort Markdown representation. A future relational block store may be dual-written and verified
against canonical JSON hashes before switching.

