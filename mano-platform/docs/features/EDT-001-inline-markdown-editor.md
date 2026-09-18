# EDT-001 — Inline Markdown block editor

## Purpose

Replace the separate source/preview interaction with one Notion-like writing surface. A writer can
type Markdown block shortcuts and continue writing without changing modes.

## Requirements

- The page body is always editable; there is no edit/preview mode switch.
- Typing `#`, `##`, `###`, `>`, `-`, `*`, `1.`, or `- [ ]` at the start of an empty text block and
  pressing Space converts that block to a heading, quote, bullet, numbered item, or checklist.
- Markdown markers disappear from the visual block after conversion while the portable Markdown
  source remains stored.
- Enter creates the next editable block. Lists and checklists continue with the same block type;
  headings return to a paragraph.
- Backspace on an empty formatted block returns it to a paragraph before deleting content.
- Pasted/imported Markdown is shown as formatted editable blocks immediately.
- Raw HTML remains text and is never injected into the DOM.
- Existing autosave, undo/redo, split panes, import/export, search, history and Markdown storage
  remain compatible.

## Scope and exceptions

This slice converts block-level shortcuts. Inline Markdown such as bold and links remains portable
source text until a later inline-range editing slice. The persisted document is still the current
single Markdown text block; the canonical server block envelope migration remains separate.

## Validation

- Space converts every supported marker and keeps Markdown source.
- Enter continues list/checklist blocks and exits headings.
- Backspace exits an empty formatted block.
- Existing Markdown renders as editable formatted blocks without executing raw HTML.
- Full typecheck, unit/component tests and production build pass.
