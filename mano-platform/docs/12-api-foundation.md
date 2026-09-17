# API foundation implementation

## Purpose

Implement the first executable backend slice for the v1 contract: fail-closed Cloudflare Access
authentication, PostgreSQL-owned identity bootstrap, and `GET /v1/me`. This is local implementation
work only; it does not create a database, Hyperdrive binding, Worker, secret, or deployment.

## Runtime boundary

- `apps/api` is a standalone fetch handler suitable for a later Cloudflare Worker entry point.
- The handler reads `Cf-Access-Jwt-Assertion`; cookies and caller-provided identity headers are ignored.
- `MANO_ACCESS_ISSUER` and `MANO_ACCESS_AUDIENCE` are mandatory. The issuer must be an HTTPS
  `cloudflareaccess.com` team URL and determines the remote JWKS endpoint.
- Signature, issuer, audience and required `sub`/`email` claims are verified before repository access.
- PostgreSQL access uses a small repository boundary. Production construction accepts a Hyperdrive
  connection string, while route tests use an in-memory repository.

## Database slice

Migration `0001_identity_workspaces.sql` installs only the tables needed by `/v1/me`:
`identity_principals`, `workspaces`, and `workspace_members`. Constraints encode supported enum
values, non-empty names/identity claims, timestamps, and unique `(issuer, subject)` ownership.

Identity bootstrap is one transaction:

1. lock or create the principal identified by `(issuer, subject)`;
2. refresh its verified email;
3. return all active memberships; or
4. if none exist, create a personal workspace and owner membership.

Concurrent first requests are serialized with a transaction-scoped PostgreSQL advisory lock derived
from issuer and subject. API responses do not expose issuer, subject, database errors, or credentials.

## Routes and failures

- `GET /health` is unauthenticated and performs no database call.
- `GET /v1/me` returns the v1 bootstrap response.
- Other paths return `NOT_FOUND`; unsupported methods return `METHOD_NOT_ALLOWED` semantics through
  HTTP 405.
- Missing/invalid Access assertions return `UNAUTHENTICATED` without repository access.
- Unexpected storage failures return the safe `STORAGE_UNAVAILABLE` envelope and a request ID.

## Verification

- JWT tests use an ephemeral RSA key and local JWKS fetch stub; no secret or network is required.
- Route tests cover health, missing authentication, valid bootstrap, method/path rejection, and safe
  storage failure handling.
- Repository tests use a recording SQL client to verify transactional bootstrap, parameterization,
  rollback, and existing-membership behavior without requiring an installed PostgreSQL server.
- Workspace checks, TypeScript, unit tests, normal build and Cloudflare web build must still pass.

