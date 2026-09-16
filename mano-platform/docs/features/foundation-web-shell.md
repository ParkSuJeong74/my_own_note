# Foundation — Web application shell

## Purpose

Create the first runnable Mano screen and establish build/test boundaries before adding interactive
workspace behavior.

## Requirements

- The root route renders Mano's product name, private-workspace purpose and honest development state.
- The document has Korean language metadata, responsive viewport behavior and useful title/description.
- Semantic landmarks and a skip link provide an accessible reading/navigation baseline.
- The layout works at narrow mobile widths without horizontal overflow.
- The shell contains no fake save, sync, login or deployment-success state.
- A production build and component tests run through the root repository check.

## Impact and exceptions

- This adds `apps/web` runtime and test dependencies.
- No editor engine, UI kit, PWA/service worker, persistence or backend is selected here.
- The screen is not yet a usable or deployable note product.

## Verification

- Component test verifies primary landmarks, heading and readiness copy.
- TypeScript validation covers application and tests.
- Next.js production build completes under Node.js 22.
