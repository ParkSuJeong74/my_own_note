# @mano/api

Service API for identity, pages, documents, databases, files, search, synchronization,
notifications, integrations, publishing, and administration. The first executable slice implements
Cloudflare Access JWT verification and `GET /v1/me` against the Mano-owned PostgreSQL boundary.

See `docs/10-backend-data-model.md`, `docs/11-api-contract-v1.md`, and
`docs/12-api-foundation.md`. The migration files are intentionally not run by package build or test;
database and Hyperdrive provisioning remain explicit operational steps.
