# ADR 0004 — MVP document body persistence

## Status

Accepted as a deliberately temporary personal-MVP adapter.

## Context and constraints

Pages must accept and recover text before an editor engine, API or IndexedDB schema is selected. The
existing tree uses versioned localStorage. Document bodies will become much larger than tree metadata,
so this choice must not silently become the long-term storage design.

## Considered options

1. IndexedDB now: appropriate for large offline documents and transactions, but schema, migration and
   recovery design should be evaluated alongside the actual block editor and operation log.
2. Versioned localStorage for the initial plain-text block: smallest testable step, with synchronous
   writes and strict browser quota limitations.
3. Wait for the API: blocks daily-use validation and couples local editing to network availability.

## Decision

Store the MVP document map under a separate versioned localStorage key. Each page maps to a validated
`DocumentState`; the initial UI edits one paragraph block. Save failures remain visible and must never
be reported as success.

This adapter is limited to early personal testing. Rich blocks, large content, attachments or offline
operation logs require an IndexedDB ADR and migration before expansion.

## Consequences and risks

- Text survives refresh in the same browser profile.
- Synchronous writes occur on each text change and are unsuitable for large documents.
- Browser quota, cleared site data and device loss can still destroy work.
- Tree and document snapshots are separate writes and are not transactionally atomic.

## Rollback or replacement path

The versioned document map can be imported into IndexedDB. Migration must verify page/document IDs and
content counts before removing the old key.

## Validation evidence

On 2026-09-16, document persistence passed nine adapter tests and four body-focused workspace tests
as part of 59 total unit/component tests, followed by strict type checking and a Next.js production
build on Node.js 22.
