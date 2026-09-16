# REL-005 — JSON backup export and restore

## Purpose

Give the personal MVP a user-controlled copy outside browser storage before irreversible deletion or
larger storage migrations are introduced.

## Requirements

- Export active and trashed folders/pages plus all page documents into one UTF-8 JSON file.
- Include a backup format version and ISO creation timestamp.
- Import validates JSON, version, timestamp, tree shape, document shape and cross-references before
  changing current data.
- Documents may reference only existing page nodes, never folders or missing nodes.
- Invalid import leaves the current workspace unchanged and announces an actionable error.
- Valid import atomically replaces the in-memory tree/document maps and then uses normal local save.
- Importing an empty valid workspace is supported.
- Export/import does not claim encryption or cloud backup.

## Boundaries and exceptions

- The JSON file contains plain user content. The UI warns the user to store it safely.
- Attachments do not exist yet and are therefore not included.
- Merge import, selective restore and encrypted archives are deferred.
- Browser download behavior is integration-tested through generated content; cross-browser E2E is
  deferred until Playwright is introduced.

## Verification

- Round-trip preserves titles, hierarchy, trash state, ordering, newlines and empty documents.
- Reject malformed JSON, unknown version, invalid date, invalid tree/document and dangling/folder
  document references.
- UI import replaces current state; invalid import preserves it and reports failure.
- Full typecheck, tests and production build pass.

On 2026-09-16, nine backup-format tests and three backup UI tests passed as part of 75 total tests,
followed by strict type checking and a Next.js production build on Node.js 22.
