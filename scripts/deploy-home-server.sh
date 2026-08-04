#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
state_dir="$repo_dir/.deploy-state"
mkdir -p "$state_dir"
cd "$repo_dir"

hash_path() {
  local target="$1"
  if [[ -d "$target" ]]; then
    find "$target" -type f -print0 \
      | sort -z \
      | xargs -0 sha256sum \
      | sha256sum \
      | cut -d' ' -f1
    return
  fi
  sha256sum "$target" | cut -d' ' -f1
}

changed() {
  local name="$1"
  local target="$2"
  local state_file="$state_dir/$name.sha256"
  local current_hash
  current_hash="$(hash_path "$target")"
  local previous_hash=""
  if [[ -f "$state_file" ]]; then
    previous_hash="$(<"$state_file")"
  fi
  printf '%s\n' "$current_hash" > "$state_file"
  [[ "$current_hash" != "$previous_hash" ]]
}

prometheus_changed=false
grafana_changed=false
alloy_changed=false
loki_changed=false

if changed prometheus monitoring/prometheus; then prometheus_changed=true; fi
if changed grafana monitoring/grafana; then grafana_changed=true; fi
if changed alloy monitoring/alloy; then alloy_changed=true; fi
if changed loki monitoring/loki; then loki_changed=true; fi

doppler run --project mano --config prd -- docker compose config --quiet

# Reconcile only changed Compose definitions. Existing unchanged containers keep running.
# No `down`, `--remove-orphans`, `pull`, or volume deletion is performed.
doppler run --project mano --config prd -- docker compose up -d

if [[ "$loki_changed" == true ]]; then
  docker restart loki >/dev/null
fi
if [[ "$alloy_changed" == true ]]; then
  docker restart alloy >/dev/null
fi
if [[ "$prometheus_changed" == true ]]; then
  docker kill --signal=SIGHUP prometheus >/dev/null
fi
if [[ "$grafana_changed" == true ]]; then
  docker restart grafana >/dev/null
fi

expected_services="$(doppler run --project mano --config prd -- docker compose config --services)"
for service in $expected_services; do
  container_id="$(doppler run --project mano --config prd -- docker compose ps -q "$service")"
  if [[ -z "$container_id" ]]; then
    echo "Missing container for service: $service" >&2
    exit 1
  fi
  running="$(docker inspect --format '{{.State.Running}}' "$container_id")"
  if [[ "$running" != "true" ]]; then
    echo "Container is not running for service: $service" >&2
    docker logs --tail=100 "$container_id" || true
    exit 1
  fi
done

doppler run --project mano --config prd -- docker compose ps
