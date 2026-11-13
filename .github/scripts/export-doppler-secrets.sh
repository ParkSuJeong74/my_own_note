#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${DOPPLER_TOKEN:-}" ]]; then
  echo "DOPPLER_TOKEN is required to read release secrets from mano/prd." >&2
  exit 1
fi

if [[ -z "${GITHUB_ENV:-}" ]]; then
  echo "GITHUB_ENV is required." >&2
  exit 1
fi

for secret_name in "$@"; do
  if [[ ! "$secret_name" =~ ^[A-Z][A-Z0-9_]*$ ]]; then
    echo "Invalid secret name: $secret_name" >&2
    exit 1
  fi

  secret_value="$(doppler secrets get "$secret_name" --plain --project mano --config prd)"
  if [[ -z "$secret_value" ]]; then
    echo "Doppler mano/prd secret is missing or empty: $secret_name" >&2
    exit 1
  fi
  if [[ "$secret_value" == *$'\n'* || "$secret_value" == *$'\r'* ]]; then
    echo "Release secret must be a single-line value: $secret_name" >&2
    exit 1
  fi

  echo "::add-mask::$secret_value"
  printf '%s=%s\n' "$secret_name" "$secret_value" >> "$GITHUB_ENV"
done
