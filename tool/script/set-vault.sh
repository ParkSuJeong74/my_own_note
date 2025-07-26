#!/bin/bash

cd "$(dirname "$0")/../.." 

if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

export VAULT_TOKEN=$VAULT_TOKEN
export VAULT_ADDR=$VAULT_ADDR
export VAULT_NAME=$VAULT_NAME

vault kv put secret/$VAULT_NAME \
    DB_HOST=$DB_HOST \
    SERVICE_WEB_PORT=$SERVICE_WEB_PORT \
    SERVICE_API_PORT=$SERVICE_API_PORT \
    SERVICE_DESKTOP_PORT=$SERVICE_DESKTOP_PORT \
    SERVICE_MOBILE_PORT=$SERVICE_MOBILE_PORT \
    SERVICE_API_URL=$SERVICE_API_URL \

vault kv get secret/my_own_note_local