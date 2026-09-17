# Foundation — Desktop workbench visual system

## Purpose

Bring the current personal editor into the intended Mano product language: a focused desktop
workbench inspired by developer editors, with a dark charcoal shell, blue accent, file tree, document
tab and persistent status feedback. This slice changes presentation and navigation density without
claiming features that are not implemented.

## Requirements

- The desktop shell uses a dark charcoal palette with `#007ACC` as the primary action and selection
  color, while preserving readable contrast and visible keyboard focus.
- The left explorer keeps all existing `EDT-002` create, select, search, trash, restore and backup
  operations and can be collapsed and restored with an accessible button.
- The explorer prioritizes the folder/page tree: page and folder creation actions sit beside the
  `내 노트` section title and immediately create uniquely named `제목 없음` pages or `새 폴더`
  folders. The new item's rename field receives selected focus so typing replaces the default name
  without another navigation step. Search remains above the tree; backup and trash stay in
  collapsible management sections below it, with storage state in the fixed explorer footer.
- Folder rows expose a separate disclosure control so selecting a folder and collapsing its children
  are independent actions. Collapsing only changes navigation visibility and never closes child tabs
  or modifies stored notes.
- The visible explorer tree supports desktop keyboard navigation: Up/Down and Home/End move focus,
  Right expands a collapsed folder or moves to its first visible child, and Left collapses an expanded
  folder or moves to its parent. Native Enter/Space activation continues to select the focused item.
- The explorer width is adjustable between practical minimum and maximum bounds using pointer drag or
  keyboard arrow keys on an accessible separator. Double-click restores the default width, and the
  separator disappears when the explorer is collapsed or the layout stacks on a narrow screen.
- Active split panes expose an orientation-aware separator. Pointer drag or arrow keys adjust the
  primary pane between 25% and 75%, while Home/End select the bounds and double-click restores an
  even split.
- Opening a page from the explorer or search adds it to the tab strip once, and an existing open page
  is activated instead of duplicated.
- Tabs can be activated and closed. Closing the active tab selects a deterministic adjacent tab;
  trashing or permanently deleting a page closes its tab without losing unrelated tabs.
- Open tab order and the active page tab are stored in a separate versioned browser-local view state
  and restored after refresh. Missing, trashed and non-page node IDs are discarded during restore;
  malformed view state recovers to an empty tab strip with a visible warning.
- An active page can be opened in a vertical split. Both panes show and edit the same persisted
  document, changes synchronize immediately, and the secondary pane can be closed without closing
  the page tab. On narrow screens the panes stack to remain usable.
- The same page can instead be opened in a horizontal split. Switching between vertical and
  horizontal layouts keeps the active tab and document content, and only one split direction is
  active at a time.
- The secondary pane has its own active tab selected from the currently open page tabs. Changing the
  primary tab does not replace the secondary document, and each pane edits its selected document
  independently while still sharing persisted document data.
- The secondary pane also owns an independent tab collection. Pages can be added from the primary
  open-tab set, switched and closed without changing primary tabs; closing the final secondary tab
  leaves an explicit empty secondary pane rather than closing the split.
- Split direction, size, secondary tab order and the active secondary tab are stored with the
  versioned workspace view and restored after refresh. Invalid or unavailable page IDs are filtered
  without affecting document data.
- Explorer width/collapsed state, collapsed folder IDs and each pane's preview mode are also restored.
  Removed folders and out-of-range layout values are discarded or normalized during hydration.
- Primary tabs can be reordered by drag/drop or explicit left/right movement controls. Reordering
  preserves the active page and is saved through the existing versioned view state.
- Desktop keyboard shortcuts support focusing new-page creation (`Cmd/Ctrl+N`), search
  (`Cmd/Ctrl+K`), explicit local save (`Cmd/Ctrl+S`), closing the active tab (`Cmd/Ctrl+W`), and
  toggling vertical or horizontal splits (`Cmd/Ctrl+\\`, `Cmd/Ctrl+Shift+\\`). Browser defaults are
  prevented only for these handled combinations.
- `Cmd/Ctrl+P` opens a searchable command palette backed by the same existing workspace actions.
  Arrow keys move through available commands, Enter executes the active command and Escape closes the
  palette. Commands that require an active page remain visibly disabled when none is selected.
- Each editor pane can independently switch between source editing and a safe Markdown preview.
  Preview supports headings, unordered and ordered lists, checklists, block quotes and fenced code
  blocks. Markdown remains plain text and preview content is never injected as raw HTML.
- Editing mode provides selection-aware Markdown controls for bold, emphasis, inline code and links,
  plus line/block insertion controls for headings, checklists and fenced code. Link previews accept
  only safe HTTP(S) and mailto destinations; unsupported destinations remain plain text.
- The status bar follows the most recently focused editor pane and reports one-based cursor line and
  column, selected character count and total document characters. Preview mode retains the latest
  valid cursor position for that pane.
- Text edits and Markdown formatting participate in page-scoped undo/redo history, capped at 100
  snapshots per page. `Cmd/Ctrl+Z` undoes and `Cmd/Ctrl+Shift+Z` or `Ctrl+Y` redoes without changing
  another page's history; history itself is session-only while the resulting text is autosaved.
- Explicit save (`Cmd/Ctrl+S` or the version-save control) records a durable page revision in a
  separate versioned browser-local store. Revisions are page-scoped, skip duplicate content and keep
  the newest 50 snapshots per page. A revision can be inspected before restoring it; restore updates
  the current editor and undo history without deleting newer revisions.
- A UTF-8 Markdown file up to 5 MiB can be imported as a new root page. Its filename becomes the page
  title and its contents remain unchanged. The active page can be exported as a `.md` download using
  a filesystem-safe title; page import/export is distinct from full-workspace JSON backup/restore.
- Inline `#tags` are derived from active page bodies without changing the document storage format.
  The explorer lists each normalized tag with its page count; selecting one reuses workspace search
  to show matching pages. Markdown headings such as `# Heading` are not interpreted as tags.
- Wiki-style `[[Page title]]` references are derived from active page bodies. Each page shows resolved
  outgoing links and backlinks that open the target page in the primary workspace. Missing or
  ambiguous duplicate titles remain visibly unresolved instead of linking to an arbitrary page.
- Folders remain explorer selections rather than document tabs.
- The editor remains a plain persisted text surface and continues to expose honest `EDT-003` local
  save state in the bottom status bar.
- Narrow screens stack the explorer and editor without horizontal overflow.
- Existing semantic names used by keyboard and assistive-technology workflows remain stable.

## Impact and boundaries

- `apps/web/app/workspace.tsx`, `page.tsx`, `layout.tsx` and `styles.css` own this visual shell.
- No external image, icon or font dependency is added; the shell uses text and system glyphs so the
  Worker build remains self-contained.
- The current browser-local tree and document formats do not change. Tab state uses its own storage
  key so view-state corruption cannot invalidate notes or folder data.

## Deferred product surfaces

- Cross-device layout synchronization remains later hosted-platform work.
- Calendars, ledgers, OCR and widgets remain their existing
  FOUNDATION/WORKSPACE roadmap items.
- AI provider keys, donation flows and blog/social screens remain separate security, compliance and
  hosted-platform work. They must not appear as working controls before their contracts exist.

## Verification

- Normal: open multiple pages, switch tabs, close the active/background tab and continue editing.
- Reorder: drag an open tab before another tab or use its accessible movement controls, then refresh
  and verify the new order and active page are retained.
- Keyboard: invoke each shortcut with both platform modifier variants and verify focus, tab and split
  state changes without triggering unavailable actions.
- Commands: filter the command palette, traverse it without a pointer, execute save/layout/navigation
  actions and dismiss it with Escape while preserving the current document.
- Markdown: switch either pane to preview and verify supported blocks render without changing the
  stored source or the other pane's edit/preview mode; raw HTML remains inert text.
- Formatting: apply inline and block controls to selections/caret positions and verify source,
  preview and persisted content stay in sync across panes.
- Status: move and select text in both panes and verify line, column and counts follow the active pane.
- History: edit multiple pages, undo/redo with controls and platform shortcuts, and verify histories
  remain isolated while the resulting document text persists normally.
- Revisions: explicitly save distinct page contents, refresh, inspect the stored versions and restore
  an older version. Verify duplicate saves add no entry, pages remain isolated and malformed revision
  storage recovers without affecting current documents.
- Markdown files: import valid `.md` text as a new page, reject unsupported or oversized files without
  changing the workspace, and export the active page with its exact source text.
- Tags: index repeated and mixed-case inline tags across active pages, exclude trashed pages and
  Markdown headings, and filter the explorer to pages containing the selected tag.
- References: resolve unique active-page titles, report missing and ambiguous links as unresolved,
  derive backlinks, and open resolved linked pages without duplicating their tabs.
- Explorer: collapse and expand nested folders while keeping open child tabs and their contents intact.
- Explorer keyboard: traverse visible rows, expand/collapse nested folders and move between child and
  parent rows without requiring a pointer.
- Layout: resize the explorer with pointer and keyboard input, verify bounds, reset it, then collapse
  and restore the explorer without displacing editor content.
- Split sizing: resize both split orientations, verify the 25–75% bounds and reset to 50%.
- Split: open a page vertically, edit it from either pane, observe synchronized content and close the
  secondary pane without changing the active tab. Switch to a horizontal split and verify the same
  behavior without activating both split directions. Select a different open tab in the secondary
  pane and verify primary navigation no longer replaces it. Add and close secondary-only tabs,
  including the final tab, without changing the primary tab collection.
- Failure: storage and validation errors remain visible against the dark theme.
- Boundary: reopening a page creates no duplicate tab; an empty tab strip, a collapsed explorer and a
  narrow viewport retain usable controls. Refresh preserves tab order and active page, while stale or
  corrupt stored tab data is ignored safely.
- Regression: search, nested creation, rename, trash, restore, permanent delete and backup tests pass
  without storage format changes.
