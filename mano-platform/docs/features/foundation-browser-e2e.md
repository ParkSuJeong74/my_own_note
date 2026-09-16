# Foundation — Production browser E2E gate

## Purpose

Verify the highest-risk personal-note journey in a real browser against the production build.

## Required journey

1. Open an empty workspace.
2. Create a folder and nested page.
3. Enter multiline body text and observe local-save status.
4. Reload and verify tree/body recovery.
5. Find the page through body search.
6. Move the page to trash and restore it without losing body text.
7. Export a JSON backup through a real browser download.

## Failure diagnostics

- Run sequentially to avoid shared server resource contention.
- Each test receives a fresh browser context and localStorage.
- Capture a trace on first retry; do not weaken assertions to hide timing errors.

## Verification

- Execute against `next start`, not a mocked component or development-only renderer.
- Existing unit/component tests, strict typecheck and production build remain mandatory.

On 2026-09-16, the required journey passed in Chromium against the production server in 2.1 seconds.
