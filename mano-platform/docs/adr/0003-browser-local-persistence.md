# ADR 0003 — Browser local persistence for the personal MVP

## Status

Accepted for the pre-account personal MVP only.

## Context and constraints

The first usable web milestone must preserve folder/page structure across refreshes before an API,
identity or synchronization protocol exists. Server rendering cannot read browser storage, and a
failed or corrupted browser write must not be reported as durable success.

## Considered options

1. `localStorage`: synchronous and size-limited, but sufficient for the small tree and easy to
   inspect, version and recover during this slice.
2. IndexedDB: better for document bodies and larger/offline data, but introduces asynchronous schema
   and migration complexity before the persisted document model is connected.
3. API/database immediately: required later for multi-device sync, but identity, contracts and
   conflict semantics are not ready.

## Decision

Persist only the page-tree snapshot in versioned `localStorage` data. Validate every loaded field,
fall back to an empty tree on missing/corrupt/unsupported data, and expose save failures in the UI.
Do not call this synchronization or backup.

Document bodies will trigger a separate IndexedDB evaluation. Server persistence will later migrate
validated local snapshots rather than reading this storage format remotely.

## Consequences and risks

- Refresh recovery works on the same browser profile only.
- Clearing site data, private mode behavior or device loss can destroy the data.
- Synchronous writes are acceptable only while this snapshot stays small.
- Storage keys and schema versions become compatibility contracts with migration tests.

## Rollback or replacement path

The storage adapter is isolated in `apps/web/lib`. A later adapter can import the validated snapshot,
write it to IndexedDB or an API, then retire the localStorage key after verified migration.

## Validation evidence

On 2026-09-16, local persistence and recovery passed ten adapter tests and four persistence-focused
workspace tests as part of 46 total unit/component tests, followed by strict type checking and a
Next.js production build on Node.js 22.
