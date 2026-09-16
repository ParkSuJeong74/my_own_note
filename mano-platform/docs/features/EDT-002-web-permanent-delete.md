# EDT-002 — Confirmed permanent deletion

## Purpose

Complete the local trash lifecycle with an intentionally difficult irreversible action after backup
export is available.

## Requirements

- Permanent deletion is available only for directly trashed roots shown in the trash section.
- Starting deletion opens an inline confirmation that names the exact target.
- The user must type the target title exactly; mismatch or blank input cannot delete.
- Cancelling closes confirmation and changes no data.
- Confirming deletes the target and its complete subtree from the page tree.
- Documents belonging to every deleted page in that subtree are removed in the same in-memory action.
- Tree and document changes flow through local automatic persistence.
- The UI states that permanent deletion cannot be restored and recommends backup first.

## Boundaries and exceptions

- Browser localStorage cannot provide a real cross-key transaction. In-memory state changes together,
  while a write failure remains visible and the prior external JSON backup is the recovery path.
- Scheduled retention, server-side soft deletion and administrator recovery belong to hosted mode.
- Duplicate titles are allowed; confirmation is tied internally to the stable node ID.

## Verification

- Delete a trashed page and remove its document.
- Delete a folder and remove all descendant page documents while preserving unrelated content.
- Reject active nodes through the domain layer.
- Wrong confirmation and cancellation preserve tree and documents.
- Full tests, typecheck and production build pass.

On 2026-09-16, three permanent-deletion UI tests passed as part of 78 total unit/component tests,
followed by strict type checking and a Next.js production build on Node.js 22.
