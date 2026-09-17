# Shared PostgreSQL host and Doppler layout

## Purpose

Run Mano Platform on the PostgreSQL server already operated for Mano Admin without coupling the two
applications' tables, migrations, or runtime credentials. Keep secrets in the existing Doppler
`mano` project while limiting each application to its own config.

## Requirements

- Reuse the `mano-admin-postgres` PostgreSQL instance and its existing backup/monitoring path.
- Give Mano Platform its own database, login role, password, and migration history.
- Do not let the Platform role connect to the Admin database or read Admin tables.
- Do not make Admin tables part of a Platform API or migration.
- Keep Admin/infra secrets in `mano/prd` and Platform secrets in `mano/prd_platform`.
- Keep `mano-platform` independently runnable; it must not read a parent `.env` or Doppler file.

## Runtime layout

```text
mano-admin-postgres:5432
├── mano_admin       owner/login: mano_admin
└── mano_platform    owner/login: mano_platform
```

The Platform connection string is assembled by its runtime as `MANO_DATABASE_URL`. Inside the root
Compose network its host is `mano-admin-postgres:5432`; a host-side process uses the published
Admin PostgreSQL port instead. A full connection URL must not be committed.

The root Compose file includes the opt-in `mano-platform-db-init` profile. It runs an idempotent
provisioner that creates or updates only the Platform role/database and revokes Platform access to
the Admin database. It is not part of ordinary `docker compose up`, and it must be run explicitly
after backup and configuration review:

```bash
doppler run --project mano --config prd_platform_setup -- \
  docker compose --profile mano-platform run --rm mano-platform-db-init
```

This command changes a database and is therefore an operational migration. Local validation only
checks its syntax and rendered Compose configuration; deployment or execution requires separate,
explicit approval.

## Doppler boundary

`mano-platform/doppler.yaml` selects `mano/prd_platform` when commands are run from the extractable
Platform directory. The config contains only Platform runtime values, including:

- `MANO_PLATFORM_DB_NAME` (default `mano_platform`)
- `MANO_PLATFORM_DB_USER` (default `mano_platform`)
- `MANO_PLATFORM_DB_PASSWORD`
- `MANO_DATABASE_URL` for the actual Platform runtime
- Platform Access, storage, realtime, and AI settings

The provisioner also needs the existing Admin bootstrap credentials. Keep those in the one-shot
`mano/prd_platform_setup` config, preferably as Doppler secret references to the Admin values.
They must not be copied into the long-running `prd_platform` runtime config, and the Platform
service must not receive `MANO_ADMIN_DB_PASSWORD`.

## Exceptions and limitations

- The current Admin database was initialized with `POSTGRES_USER=mano_admin`; PostgreSQL therefore
  treats that role as a cluster superuser. Separate Platform credentials prevent Platform-to-Admin
  access but do not provide a hard Admin-to-Platform security boundary. Removing that privilege
  requires a separately planned bootstrap-role migration and restore rehearsal.
- One PostgreSQL process remains a shared failure and capacity boundary. A database outage affects
  both applications, and backup/restore procedures must verify both logical databases.
- The provisioner intentionally does not install Platform application migrations. Those remain
  owned by `mano-platform/apps/api/migrations`.

## Validation

- Parse `docker-compose.yml` and both Doppler YAML files.
- Run `bash -n scripts/init-mano-platform-db.sh`.
- Render the base Compose configuration without Platform secrets.
- Render the `mano-platform` profile with placeholder Admin and Platform credentials.
- In an isolated PostgreSQL test instance, run the provisioner twice and verify the Platform role
  can connect to `mano_platform` but cannot connect to `mano_admin`.
- Before production use, back up the PostgreSQL volume and rehearse restoration of both databases.
