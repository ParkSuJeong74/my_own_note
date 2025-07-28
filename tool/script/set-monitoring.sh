#!/bin/bash

cd "$(dirname "$0")/../docker" 

cp ../../.env.local .env
docker-compose -f docker-compose.monitoring.yml up -d
rm .env