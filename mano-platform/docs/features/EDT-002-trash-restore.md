# EDT-002 — Trash, restore and permanent deletion

## Purpose

Add a recoverable deletion lifecycle to the page tree before any UI or persistence layer depends on
unsafe delete behavior.

## Requirements

- Moving an active node to trash marks that node as directly trashed.
- Descendants of a trashed folder are effectively in trash without losing their own prior state.
- Restoring the directly trashed folder makes its non-trashed descendants active again.
- A directly trashed node can be restored only when none of its ancestors is trashed.
- A node that is only indirectly in trash cannot be restored separately; restore its trashed
  ancestor first.
- Rename and move operations reject nodes that are effectively in trash.
- Active nodes cannot be moved into a directly or indirectly trashed folder.
- Permanent deletion is permitted only for a directly trashed node and removes its entire subtree.
- Failed operations return typed errors and leave the input state unchanged.

## Impact and boundaries

- Implementation remains framework-independent in `packages/editor-core`.
- `trashed` records direct trash intent. Effective trash state is derived by walking ancestors.
- UI filtering, confirmation dialogs, retention periods and scheduled purge are deferred.

## Exceptions

- Archive is not treated as trash and will be a separate lifecycle state later.
- Permanent deletion cannot currently be undone; future persistence must require an explicit UI
  confirmation and may add retention or backup recovery.
- Moving a whole trashed subtree inside the trash is not supported in this slice.

## Verification

- Normal: trash/restore a page, trash/restore a folder, permanently delete a subtree.
- Failure: restore active/indirectly trashed nodes, edit/move trash contents, move into trash,
  permanently delete active content.
- Boundary: deep descendants derive trash state correctly; restoring a parent preserves a child that
  had independently been trashed earlier.
- Regression: all successful and failed operations preserve prior state objects and arrays.
