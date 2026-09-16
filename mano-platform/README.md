# Mano Platform

The next-generation Mano product is incubated here as a self-contained monorepo. The directory is
designed to become an independent repository and deployable service later.

## Current phase

Repository foundation plus the first framework-independent domain slice. No application framework,
editor engine or production data model has been selected yet.

## Start here

1. [Product vision](docs/00-product-vision.md)
2. [Requirements catalog](docs/01-product-requirements.md)
3. [Architecture and extraction boundary](docs/02-architecture.md)
4. [Delivery roadmap](docs/03-roadmap.md)
5. [Legacy intake process](docs/04-legacy-intake.md)
6. [Product stages and metrics](docs/05-product-stages-and-metrics.md)
7. [Technology candidates](docs/06-technology-candidates.md)
8. [Error contract](docs/07-error-contract.md)
9. [Complete feature coverage](docs/08-feature-coverage.md)
10. [CI/CD and Cloudflare deployment](docs/09-ci-cd-cloudflare.md)

## Workspace layout

- `apps/web`: browser and PWA client
- `apps/api`: service API
- `apps/worker`: background jobs
- `packages/contracts`: shared API and event contracts
- `packages/editor-core`: editor domain operations
- `packages/sync-core`: offline and reconciliation primitives
- `packages/ui`: design system
- `packages/config`: shared tool configuration
- `infra`: service-owned local and deployment infrastructure

## Commands

```bash
pnpm check
```

For a release candidate with Playwright's Chromium browser installed:

```bash
pnpm check:release
```

The check validates repository structure and documentation links, then runs strict type checking,
unit tests and the build for implemented packages. Framework-specific checks will be added with the
corresponding ADR and application scaffold.

## Parent repository isolation

Code in this directory must not import from `../mano-admin` or any other parent path. Legacy Mano
stays operational while artifacts are reviewed through the documented intake process.
