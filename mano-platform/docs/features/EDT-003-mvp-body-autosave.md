# EDT-003 — MVP page body and automatic local save

## Purpose

Allow a selected page to contain editable text and recover that text after refresh.

## Requirements

- Every newly created page receives a document with one paragraph block.
- Selecting a page exposes a labeled multiline text field bound to that paragraph.
- Text, including empty text and line breaks, is preserved exactly.
- Existing pages without a document receive an empty document when first edited.
- Document snapshots are versioned and validated before use.
- Corrupt/unsupported document data recovers to an empty document map with a visible warning.
- Every successful edit triggers local save and accurately reports write failure.
- Folder selection never shows or changes page body content.

## Boundaries

- This is a plain-text MVP, not the final block editor.
- Only the first paragraph block is exposed in the UI.
- Undo/redo, Markdown shortcuts, formatting, large-document storage and cloud sync are deferred.

## Verification

- Adapter: empty, round-trip, malformed JSON/version/document/block and write failure.
- UI: edit, page isolation, refresh restoration, legacy page initialization and save failure.
- Full typecheck, tests and production build must pass.
