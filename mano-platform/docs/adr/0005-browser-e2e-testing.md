# ADR 0005 — Browser end-to-end testing

## Status

Accepted for web release gates.

## Context and constraints

Component tests verify isolated UI behavior but cannot prove that the built Next.js application,
browser storage, refresh lifecycle, downloads and real accessibility selectors work together. A
deployable milestone needs a deterministic browser gate.

## Considered options

1. Playwright: first-party Chromium/Firefox/WebKit control, web-server lifecycle, downloads, storage
   and trace support.
2. Cypress: capable browser testing, but adds a different execution model without a current project
   advantage.
3. Manual browser checks only: useful for visual review but not repeatable enough for release gates.

## Decision

Use Playwright Test against the production Next.js server. Start with Chromium and one worker for
determinism. Tests use accessible roles/labels and isolated browser contexts. Failed CI runs retain
traces; reports and artifacts are ignored by Git.

Firefox, WebKit and mobile emulation are required before claiming broad cross-browser production
support, but Chromium covers the initial personal-web preview gate.

## Consequences and risks

- Browser binaries and Linux dependencies add installation time and disk usage.
- E2E tests are slower than unit tests and cover only high-value journeys.
- A successful Chromium run does not prove mobile Safari or Firefox compatibility.

## Rollback or replacement path

Tests interact through user-visible behavior rather than internal APIs, so another browser runner can
replace Playwright without changing product code.

## Validation evidence

On 2026-09-16, Playwright 1.63 ran the full personal-note journey successfully in its matching
official Chromium container against `next start`. The same release gate also passed 86
unit/component tests, strict type checking and the production build.

## References

- [Playwright configuration](https://playwright.dev/docs/test-configuration)
- [Playwright browser installation](https://playwright.dev/docs/browsers)
- [Playwright CI guidance](https://playwright.dev/docs/ci)
