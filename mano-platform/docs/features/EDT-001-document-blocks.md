# EDT-001 — Document block foundation

## Purpose

Define a portable document model before selecting a visual editor engine. This slice provides the
minimum block operations needed by a future page editor without browser or storage dependencies.

## Requirements

- A document has a stable non-empty ID and an ordered list of blocks.
- Supported initial block types are paragraph, heading and checklist.
- Every block has a unique non-empty ID and text content.
- Heading levels are limited to 1, 2 or 3.
- Only checklist blocks carry completion state.
- Blocks can be inserted at any index from zero through the current block count.
- Text can be updated without changing block identity or type.
- Blocks can be converted between supported types with explicit heading/checklist options.
- Checklist completion can be toggled only on checklist blocks.
- Blocks can be removed and reordered; an empty document is valid.
- Failed operations return typed errors and never mutate the input document.

## Impact and boundaries

- Implementation: `packages/editor-core/src/document.ts`
- The model deliberately avoids HTML and editor-engine JSON.
- Tree node titles remain in the page tree; this document contains page body blocks only.

## Deferred behavior

- Rich inline marks, nested blocks, tables, media, code and Markdown conversion are later slices.
- Undo/redo, persistence, autosave and synchronization are separate requirements.
- Collaborative operation encoding is not implied by these local commands.

## Verification

- Normal: insert all supported types, edit text, convert, toggle, reorder and remove.
- Failure: duplicate/empty IDs, invalid index/heading level, missing block and invalid toggle.
- Boundary: insert into empty document, insert at end, remove final block and no-op reorder.
- Regression: previous document and block objects remain unchanged after success or failure.
