#!/bin/bash

cd "$(dirname "$0")/../docker" 

cp ../../.env.local .env
docker-compose up -d
rm .env