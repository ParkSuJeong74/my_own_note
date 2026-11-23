import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import test from 'node:test';
import {entities} from '../dist/database/entities.js';
import {dataSource} from '../dist/database/data-source.js';
test('TypeORM maps existing tables without destructive synchronization or automatic startup migration',()=>{
 assert.equal(dataSource.options.synchronize,false);assert.equal(dataSource.options.migrationsRun,false);
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
