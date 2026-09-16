# REL-003 — Local tree persistence and recovery

## Purpose

Keep the current folder/page tree across refreshes on one browser without implying cloud sync.

## Requirements

- Load a versioned tree snapshot after the client mounts.
- Treat a missing snapshot as a valid empty workspace.
- Validate the complete snapshot before exposing it to the domain/UI.
- Recover to an empty tree when JSON, version, node shape, parent reference, order or tree invariants
  are invalid, and show a recovery warning.
- Save every successful tree change after initial loading.
- Show `불러오는 중`, `이 브라우저에 저장됨`, or a visible save-failure state accurately.
- Never overwrite stored data with the initial empty server-rendered state before loading completes.

## Boundaries

- This stores tree metadata only; page bodies are not yet persisted.
- It is neither backup nor multi-device synchronization.
- Recovery does not delete the corrupt value automatically, preserving diagnostic/migration options.

## Verification

- Adapter: absent, valid, malformed JSON, unsupported version, malformed nodes, invalid parents,
  duplicate IDs and write exceptions.
- UI: restored tree appears, new tree persists, corrupt storage warns, write failure is visible.
- Full typecheck, tests and production build must pass from a clean install.
