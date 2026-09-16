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
- The explorer prioritizes the folder/page tree: creation and search stay compact at the top, while
  backup and trash live in collapsible management sections below the tree. Storage state remains
  visible in a fixed explorer footer instead of competing with document navigation.
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
- Primary tabs can be reordered by drag/drop or explicit left/right movement controls. Reordering
  preserves the active page and is saved through the existing versioned view state.
- Desktop keyboard shortcuts support focusing new-page creation (`Cmd/Ctrl+N`), search
  (`Cmd/Ctrl+K`), explicit local save (`Cmd/Ctrl+S`), closing the active tab (`Cmd/Ctrl+W`), and
  toggling vertical or horizontal splits (`Cmd/Ctrl+\\`, `Cmd/Ctrl+Shift+\\`). Browser defaults are
  prevented only for these handled combinations.
- Each editor pane can independently switch between source editing and a safe Markdown preview.
  Preview supports headings, unordered and ordered lists, checklists, block quotes and fenced code
  blocks. Markdown remains plain text and preview content is never injected as raw HTML.
- Folders remain explorer selections rather than document tabs. Independent tab collections per
  pane and resizable dividers remain later `EDT-021` slices.
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

- Independent tab collections per pane and resizable dividers remain later `EDT-021` work.
- Inline rich-text commands, calendars, ledgers, OCR and widgets remain their existing
  FOUNDATION/WORKSPACE roadmap items.
- AI provider keys, donation flows and blog/social screens remain separate security, compliance and
  hosted-platform work. They must not appear as working controls before their contracts exist.

## Verification

- Normal: open multiple pages, switch tabs, close the active/background tab and continue editing.
- Reorder: drag an open tab before another tab or use its accessible movement controls, then refresh
  and verify the new order and active page are retained.
- Keyboard: invoke each shortcut with both platform modifier variants and verify focus, tab and split
  state changes without triggering unavailable actions.
- Markdown: switch either pane to preview and verify supported blocks render without changing the
  stored source or the other pane's edit/preview mode; raw HTML remains inert text.
- Split: open a page vertically, edit it from either pane, observe synchronized content and close the
  secondary pane without changing the active tab. Switch to a horizontal split and verify the same
  behavior without activating both split directions. Select a different open tab in the secondary
  pane and verify primary navigation no longer replaces it.
- Failure: storage and validation errors remain visible against the dark theme.
- Boundary: reopening a page creates no duplicate tab; an empty tab strip, a collapsed explorer and a
  narrow viewport retain usable controls. Refresh preserves tab order and active page, while stale or
  corrupt stored tab data is ignored safely.
- Regression: search, nested creation, rename, trash, restore, permanent delete and backup tests pass
  without storage format changes.
