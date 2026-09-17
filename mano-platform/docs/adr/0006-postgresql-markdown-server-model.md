# ADR 0006 — PostgreSQL and Markdown-first server model

## Status

Partially superseded by ADR 0007. PostgreSQL, identity, workspace ownership, revisions, and backup
remain accepted; Markdown is no longer the canonical document representation.

## Context and constraints

The browser-local editor now needs a durable server authority, revision history and an offline sync
contract. Mano Admin authenticates a single pilot through Cloudflare Access but has no reusable user
account table. Its historical workspace tables do not contain a sufficient ownership boundary, and
the platform architecture forbids direct runtime access to the parent Admin database.

The current editor presents Markdown-compatible text even though its local adapter wraps text in a
minimal `DocumentState`. Selecting a rich block schema before editor-engine and synchronization
evidence would make the API unstable.

## Considered options

1. Reuse the Admin tables and database directly. This is operationally convenient but violates the
   extraction boundary, lacks tenant ownership and couples migrations between services.
2. Cloudflare D1. This fits Worker deployment but introduces a second database technology, different
   operational semantics and tighter platform coupling before there is evidence it is needed.
3. Mano-owned PostgreSQL schema with Markdown source and immutable revisions. This keeps ownership,
   transactions, constraints and backup behavior explicit while matching the current editor.
4. PostgreSQL block tables immediately. This supports future rich editing but prematurely fixes a
   block protocol and complicates offline operations before the editor model is selected.

## Decision

Use a Mano Platform-owned PostgreSQL database/schema as the server authority. It may run on the same
PostgreSQL host as Admin but must use separate credentials and no cross-service table reads.
The concrete shared-host provisioning and Doppler boundaries are documented in
`docs/16-shared-postgres-and-doppler.md`.

Identify authenticated principals by verified Cloudflare Access `(issuer, subject)`; email is mutable
profile data. Every content entity is owned through a workspace membership. Accept client-generated
UUIDs and idempotent operation UUIDs for offline creation/retry. The original decision to store
canonical Markdown with immutable snapshots is superseded by ADR 0007's canonical block envelope;
the optimistic revision and immutable snapshot requirements still apply.

Object bytes will use S3-compatible storage after a separate attachment-policy decision. Tags,
references and search indexes are derived data.

## Consequences and risks

- PostgreSQL transactions can enforce workspace ownership and atomic revision creation.
- The API and database are portable outside Cloudflare and the parent Admin repository.
- Access subject mapping supports email changes, but identity-provider migration requires explicit
  account linking rather than matching unverified email.
- Markdown-first storage delays rich block collaboration. A later block model needs a versioned
  conversion contract, not an in-place reinterpretation.
- Hosting another database role/schema and backups adds operational work.
- PostgreSQL does not itself solve offline conflict UX; operation and revision contracts are still
  required before synchronization is claimed.

## Rollback or replacement path

Canonical Markdown and immutable revisions can be exported as ordinary files plus metadata. A future
block store can be populated alongside documents, verified by round-trip Markdown hashes, and then
switched per workspace. D1 or another store can consume the same versioned export without reading
Admin tables. Identity adapters can add another `(issuer, subject)` mapping to the same principal.

## Validation evidence

The design was checked against the existing browser tree/document/revision formats, the Admin
Cloudflare Access verifier and Admin SQL schema. No migration or production database change was made.
Implementation requires schema, authorization, idempotency, concurrency, migration dry-run and
backup-restore tests described in `docs/10-backend-data-model.md`.
