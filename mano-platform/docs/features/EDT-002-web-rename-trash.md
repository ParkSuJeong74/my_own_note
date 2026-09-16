# EDT-002 — Web rename, trash and restore

## Purpose

Expose safe page-tree lifecycle operations in the web workspace without introducing irreversible
deletion.

## Requirements

- A selected active folder or page can be renamed to a non-empty title.
- Rename validation errors are announced and leave the prior title unchanged.
- A selected active node can be moved to trash.
- Trashing a folder hides its complete subtree from the active tree while preserving all documents.
- The sidebar shows directly trashed roots in a separate trash section.
- Restoring a trashed root returns it and its non-independently-trashed descendants to the tree.
- Selection is cleared when its node becomes hidden in trash.
- Rename, trash and restore changes use the existing local automatic-save status.

## Boundaries and exceptions

- Permanent deletion is intentionally absent until confirmation, retention and backup behavior are
  specified.
- The trash list shows recoverable roots rather than every effectively trashed descendant.
- Rename affects navigation titles only, not body text.

## Verification

- Normal: rename page/folder, trash/restore page, trash/restore folder subtree with body retained.
- Failure: blank rename is rejected without state change.
- Boundary: empty trash section and multiple recoverable roots.
- Regression: restored pages retain their original body and tree order.
