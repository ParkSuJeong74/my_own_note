# @mano/editor-core

Framework-light document operations, commands, selection semantics, history, import/export behavior,
and invariants. It must not depend on browser UI components.

## Implemented slices

- `EDT-002`: immutable folder/page tree creation, rename and safe movement.
- `EDT-002`: recoverable trash/restore lifecycle and guarded permanent subtree deletion.
- `EDT-002`: deterministic sibling ordering and safe reorder/move behavior.
- `EDT-001`: portable paragraph, heading and checklist document blocks with immutable commands.
