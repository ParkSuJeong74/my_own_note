import assert from 'node:assert/strict';import test from 'node:test';
import {databaseConfig} from '../dist/database/config.js';
const env={PGHOST:'127.0.0.1',PGUSER:'qa',PGDATABASE:'qa',PGPASSWORD:' qa-test-only '};
test('database connection requires an explicit target and preserves password bytes',()=>{
 assert.equal(databaseConfig(env).password,env.PGPASSWORD);
 for(const name of ['PGHOST','PGUSER','PGDATABASE','PGPASSWORD'])assert.throws(()=>databaseConfig({...env,[name]:''}),new RegExp(name+' is required'));
});
test('invalid database ports never fall back to a default connection',()=>{
 assert.equal(databaseConfig({...env,PGPORT:'5433'}).port,5433);
 for(const port of ['','abc','1e3','0','65536','-1','5.5'])assert.throws(()=>databaseConfig({...env,PGPORT:port}),/PGPORT/);
});
