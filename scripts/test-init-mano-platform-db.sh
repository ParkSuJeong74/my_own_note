#!/bin/sh

set -eu

repo_root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
container_name="mano-platform-db-test-$$"
admin_password="test-admin-password"
platform_password="test-platform-password"

cleanup() {
  docker rm --force "$container_name" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker run --detach \
  --name "$container_name" \
  --env POSTGRES_DB=mano_admin \
  --env POSTGRES_USER=mano_admin \
  --env POSTGRES_PASSWORD="$admin_password" \
  --mount "type=bind,source=$repo_root/scripts/init-mano-platform-db.sh,target=/usr/local/bin/init-mano-platform-db.sh,readonly" \
  postgres:16.10-alpine >/dev/null

attempt=0
until docker exec "$container_name" pg_isready --host 127.0.0.1 --username mano_admin --dbname mano_admin >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "PostgreSQL test container did not become ready" >&2
    exit 1
  fi
  sleep 1
done

run_provisioner() {
  docker exec \
    --env PGHOST=127.0.0.1 \
    --env MANO_ADMIN_DB_PASSWORD="$admin_password" \
    --env MANO_PLATFORM_DB_PASSWORD="$platform_password" \
    "$container_name" \
    /bin/sh /usr/local/bin/init-mano-platform-db.sh >/dev/null
}

run_provisioner
run_provisioner

docker exec \
  --env PGPASSWORD="$platform_password" \
  "$container_name" \
  psql --host 127.0.0.1 --username mano_platform --dbname mano_platform \
  --tuples-only --command "SELECT current_database(), current_user" |
  grep -Eq 'mano_platform[[:space:]]*\|[[:space:]]*mano_platform'

if docker exec \
  --env PGPASSWORD="$platform_password" \
  "$container_name" \
  psql --host 127.0.0.1 --username mano_platform --dbname mano_admin \
  --command "SELECT 1" >/dev/null 2>&1; then
  echo "Platform role unexpectedly connected to the Admin database" >&2
  exit 1
fi

if docker exec \
  --env PGHOST=127.0.0.1 \
  --env MANO_ADMIN_DB_PASSWORD="$admin_password" \
  --env MANO_PLATFORM_DB_PASSWORD="$platform_password" \
  --env MANO_PLATFORM_DB_NAME=mano_admin \
  "$container_name" \
  /bin/sh /usr/local/bin/init-mano-platform-db.sh >/dev/null 2>&1; then
  echo "Provisioner accepted identical Admin and Platform database names" >&2
  exit 1
fi

echo "Mano Platform database provisioning test passed"
