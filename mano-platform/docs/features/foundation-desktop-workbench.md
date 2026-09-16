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
- Folders remain explorer selections rather than document tabs. Independent per-pane tabs,
  resizable dividers and tab drag/drop remain later `EDT-021` slices.
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

- Independent per-pane tabs, resizable dividers and drag/drop tabs remain later `EDT-021` work.
- Rich Markdown blocks, checklists, calendars, ledgers, OCR and widgets remain their existing
  FOUNDATION/WORKSPACE roadmap items.
- AI provider keys, donation flows and blog/social screens remain separate security, compliance and
  hosted-platform work. They must not appear as working controls before their contracts exist.

## Verification

- Normal: open multiple pages, switch tabs, close the active/background tab and continue editing.
- Split: open a page vertically, edit it from either pane, observe synchronized content and close the
  secondary pane without changing the active tab. Switch to a horizontal split and verify the same
  behavior without activating both split directions.
- Failure: storage and validation errors remain visible against the dark theme.
- Boundary: reopening a page creates no duplicate tab; an empty tab strip, a collapsed explorer and a
  narrow viewport retain usable controls. Refresh preserves tab order and active page, while stale or
  corrupt stored tab data is ignored safely.
- Regression: search, nested creation, rename, trash, restore, permanent delete and backup tests pass
  without storage format changes.
