import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import test from 'node:test';
import {entities} from '../dist/database/entities.js';
import {databaseConfig} from '../dist/database/config.js';
test('TypeORM maps existing tables without destructive synchronization or automatic startup migration',()=>{
 const source=readFileSync(new URL('../src/database/data-source.ts',import.meta.url),'utf8');
 assert.ok(source.includes('synchronize:false'));assert.ok(source.includes('migrationsRun:false'));
 assert.equal(databaseConfig({PGHOST:'127.0.0.1',PGUSER:'qa',PGPASSWORD:'qa-only',PGDATABASE:'qa'}).port,5432);
 assert.equal(entities.length,7);
 assert.ok(entities.every(entity=>entity.options.tableName?.startsWith('easyopen_')));
});
test('deployment migration failure stops before application replacement and fingerprint update',()=>{
 const script=readFileSync(new URL('../../../../scripts/deploy-home-server.sh',import.meta.url),'utf8');
 assert.ok(script.includes('set -euo pipefail'));
 const migrate=script.indexOf('easyopen-server npm run migration:run');
 const update=script.indexOf('up -d --wait --wait-timeout 90 easyopen-server easyopen-api');
 const checkpoint=script.indexOf('> "$easyopen_state_file"');
 assert.ok(migrate>=0&&migrate<update&&update<checkpoint);
});
