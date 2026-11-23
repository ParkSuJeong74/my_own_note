import assert from 'node:assert/strict';import {existsSync,readFileSync} from 'node:fs';import test from 'node:test';
test('account web owns UI while backend owns legacy SQL; old api folder is absent',()=>{
 assert.equal(existsSync(new URL('../../api/',import.meta.url)),false);
 assert.ok(existsSync(new URL('../../server/db/legacy/001-initial.sql',import.meta.url)));
 assert.ok(existsSync(new URL('../../server/db/legacy/002-device-sessions.sql',import.meta.url)));
 const compose=readFileSync(new URL('../../../../docker-compose.yml',import.meta.url),'utf8');
 assert.ok(compose.includes('context: ./easyopen/apps/account-web'));
 assert.ok(compose.includes('./easyopen/apps/server/db/legacy:/docker-entrypoint-initdb.d:ro'));
 assert.ok(!compose.includes('apps/api'));
 const workflow=readFileSync(new URL('../../../../.github/workflows/deploy.yml',import.meta.url),'utf8');
 assert.ok(workflow.includes('working-directory: easyopen/apps/account-web'));
 assert.ok(workflow.includes('easyopen/apps/account-web/**'));
});
