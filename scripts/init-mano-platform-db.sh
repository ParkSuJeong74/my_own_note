#!/bin/sh

set -eu

: "${MANO_ADMIN_DB_PASSWORD:?MANO_ADMIN_DB_PASSWORD is required}"
: "${MANO_PLATFORM_DB_PASSWORD:?MANO_PLATFORM_DB_PASSWORD is required}"

admin_db=${MANO_ADMIN_DB_NAME:-mano_admin}
admin_user=${MANO_ADMIN_DB_USER:-mano_admin}
platform_db=${MANO_PLATFORM_DB_NAME:-mano_platform}
platform_user=${MANO_PLATFORM_DB_USER:-mano_platform}

if [ "$admin_db" = "$platform_db" ]; then
  echo "Admin and Platform database names must differ" >&2
  exit 1
fi

if [ "$admin_user" = "$platform_user" ]; then
  echo "Admin and Platform database roles must differ" >&2
  exit 1
fi

export PGPASSWORD=$MANO_ADMIN_DB_PASSWORD

psql \
  --host "${PGHOST:-mano-admin-postgres}" \
  --port "${PGPORT:-5432}" \
  --username "$admin_user" \
  --dbname "$admin_db" \
  --set ON_ERROR_STOP=1 \
  --set admin_db="$admin_db" \
  --set admin_user="$admin_user" \
  --set platform_db="$platform_db" \
  --set platform_user="$platform_user" \
  --set platform_password="$MANO_PLATFORM_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN', :'platform_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'platform_user')
\gexec

SELECT format(
  'ALTER ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
  :'platform_user',
  :'platform_password'
)
\gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'platform_db', :'platform_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'platform_db')
\gexec

SELECT format('ALTER DATABASE %I OWNER TO %I', :'platform_db', :'platform_user')
\gexec

SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', :'admin_db')
\gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'admin_db', :'admin_user')
\gexec

SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', :'platform_db')
\gexec
SELECT format('GRANT CONNECT, TEMPORARY ON DATABASE %I TO %I', :'platform_db', :'platform_user')
\gexec
SQL

echo "Mano Platform database and role are ready"
