# EDT-002 — Page tree foundation

## Purpose

Provide the first executable Mano domain feature: a framework-independent tree that can contain
folders and pages. This slice covers creation, renaming and movement. Persistence, UI, deletion,
archive/restore, ordering and synchronization remain later slices.

## Requirements

- A node is either a `folder` or `page`, has a stable non-empty ID and title, and may be at the root.
- Folders may contain folders or pages. Pages cannot contain children.
- IDs are unique across the tree.
- A node may be moved to the root or an existing folder.
- Moving a folder into itself or any descendant is rejected.
- Failed commands return a typed domain error and do not mutate the input state.
- Commands return new state; existing nodes and input arrays are not mutated.
- Empty or whitespace-only IDs/titles are rejected. User-visible titles are trimmed.

## Impact and boundaries

- Implementation: `packages/editor-core`
- No browser, database, network, framework or editor-engine dependency.
- Consumers will later add persistence and issue these operations through explicit commands.

## Exceptions and deferred behavior

- Sibling ordering is insertion order only; explicit reorder comes in a separate requirement slice.
- Archive, trash, restore and permanent deletion are not part of this slice.
- Page contents are deliberately absent; this feature models navigation structure only.

## Verification

- Normal: create root folder/page, create child, rename, move to folder/root.
- Failure: duplicate ID, missing parent/node, page as parent, self/descendant cycle.
- Boundary: trimmed title, empty ID/title and deep valid hierarchy.
- Regression: failed operations and successful operations do not mutate prior state.
