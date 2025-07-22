#!/bin/bash

cd "$(dirname "$0")/../.." 

if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

export VAULT_ADDR='http://localhost:8200'
export VAULT_TOKEN='my_own_note_vault_token'

vault kv put secret/my_own_note_local \
    DB_HOST=$DB_HOST \
    SERVICE_WEB_PORT=$SERVICE_WEB_PORT \
    SERVICE_API_PORT=$SERVICE_API_PORT \
    SERVICE_DESKTOP_PORT=$SERVICE_DESKTOP_PORT \
    SERVICE_MOBILE_PORT=$SERVICE_MOBILE_PORT

vault kv get secret/my_own_note_local