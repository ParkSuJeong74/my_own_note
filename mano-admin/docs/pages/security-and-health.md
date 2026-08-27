# Security and health

## Authentication

Cloudflare Access protects `admin.mano.io.kr` with an exact-email Allow policy. The origin also
verifies the `Cf-Access-Jwt-Assertion` signature, issuer, application audience, token type and
allowed email. There is no local password or registration system.

## Public health endpoint

`GET /api/health` is excluded from origin JWT verification so Docker can check it internally.
The Cloudflare Access application still protects the hostname externally. The response contains
only service status, database readiness and a timestamp.

## Container permissions

The Admin container runs non-root with a read-only filesystem, dropped Linux capabilities,
`no-new-privileges` and a limited temporary directory. It has no Docker socket and no shared file
mount.

## PostgreSQL

The application connects internally to `mano-admin-postgres:5432`. The database is also published
on configurable host port `5434` to match existing project DB operations. Restrict remote access
to trusted networks such as Tailscale and back up `mano_admin_postgres_data`.
