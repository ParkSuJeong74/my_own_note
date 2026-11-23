import {applyMigrations} from '../dist/database/migration-runner.js';
import {createServer} from 'node:net';
import {DataSource} from 'typeorm';
import {entities} from '../dist/database/entities.js';
import {AccountService} from '../dist/accounts/account.service.js';
import assert from 'node:assert/strict';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {randomBytes,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {SignJWT} from 'jose';
import pg from 'pg';
if(process.env.EASYOPEN_DOCKER_QA!=='1')throw new Error('Set EASYOPEN_DOCKER_QA=1 for isolated temporary PostgreSQL QA.');
const exec=promisify(execFile),docker=process.env.EASYOPEN_QA_DOCKER||'docker';
const name='easyopen-account-qa-'+Date.now(),password=randomBytes(32).toString('hex'),secret=randomBytes(32).toString('hex');
const hash=value=>createHash('sha256').update(value).digest('hex');
const origin='http://127.0.0.1:4284',publicOrigin='https://easyopen-api.mano.io.kr';
let server,web,db,created=false;
const request=(path,options={})=>fetch(origin+path,{redirect:'manual',...options});
const post=(path,body,headers={})=>request(path,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
try{
  for(const port of [3001,4284,...(process.env.EASYOPEN_UI_NODE?[4281,4282]:[])]){const listener=createServer();await new Promise((resolve,reject)=>{listener.once('error',()=>reject(new Error('QA port already in use: '+port)));listener.listen(port,'127.0.0.1',resolve);});await new Promise(resolve=>listener.close(resolve));}
  await exec(docker,['run','--pull=never','-d','--name',name,'--label','kr.io.mano.easyopen.qa='+name,'--env','POSTGRES_PASSWORD','-p','127.0.0.1::5432','postgres:16.16-alpine@sha256:81e77a4833487b8132fe4b00bedd39dc3f74b8641e387f19312a48f7de218c2e'],{env:{...process.env,POSTGRES_PASSWORD:password}});created=true;
  const {stdout}=await exec(docker,['port',name,'5432/tcp']);const port=Number(stdout.trim().split(':').at(-1));
  db=new pg.Pool({host:'127.0.0.1',port,user:'postgres',password,database:'postgres',connectionTimeoutMillis:1000});
  let ready=false;for(let i=0;i<40;i++){try{await db.query('SELECT 1');ready=true;break;}catch{}await delay(500);}assert.ok(ready);
  console.log('Isolated PostgreSQL '+(await db.query('SHOW server_version')).rows[0].server_version);
  const dbEnv={...process.env,PGHOST:'127.0.0.1',PGPORT:String(port),PGUSER:'postgres',PGPASSWORD:password,PGDATABASE:'postgres'};
  const migrate=()=>exec(process.execPath,['dist/database/migrate.js'],{env:dbEnv});
  await Promise.all([migrate(),migrate()]);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM easyopen_migrations')).rows[0].count,2);
  // An incompatible legacy schema must fail without recording or half-applying a migration.
  await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public; CREATE TABLE easyopen_users(id uuid PRIMARY KEY)');
  await assert.rejects(migrate);
  assert.equal((await db.query("SELECT to_regclass('public.easyopen_entitlements') AS name")).rows[0].name,null);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM easyopen_migrations')).rows[0].count,0);
  // Rehearse migration from the existing SQL-managed schema with a preserved member.
  await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  await db.query(await readFile(new URL('../../api/db/001-initial.sql',import.meta.url),'utf8'));
  const user=(await db.query("INSERT INTO easyopen_users(google_subject,email) VALUES('qa','qa@example.invalid') RETURNING id")).rows[0];
  await migrate();await migrate();
  assert.equal((await db.query('SELECT id FROM easyopen_users WHERE id=$1',[user.id])).rowCount,1);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM easyopen_migrations')).rows[0].count,2);
  const orm=new DataSource({type:'postgres',host:'127.0.0.1',port,username:'postgres',password,database:'postgres',entities,synchronize:false});
  await orm.initialize();
  try{
    const accounts=new AccountService(orm);
    const updated=await accounts.upsertGoogleUser({subject:'qa',email:'QA@EXAMPLE.INVALID',name:'QA User',picture:null});
    assert.equal(updated.id,user.id);assert.equal(updated.email,'qa@example.invalid');
    await accounts.setAdminEntitlement({actorUserId:user.id,userId:user.id,key:'commercial:cosyvoice-studio',active:true,endsAt:null});
    assert.equal((await accounts.listEntitlements(user.id)).length,1);
    await accounts.setAdminEntitlement({actorUserId:user.id,userId:user.id,key:'commercial:cosyvoice-studio',active:false,endsAt:null});
    assert.ok((await accounts.listEntitlements(user.id))[0].revokedAt);
    const before=(await db.query('SELECT count(*)::int AS count FROM easyopen_audit_events')).rows[0].count;
    await assert.rejects(()=>accounts.setAdminEntitlement({actorUserId:'00000000-0000-0000-0000-000000000000',userId:user.id,key:'commercial:jellyfin-plus',active:true,endsAt:null}));
    assert.equal((await accounts.listEntitlements(user.id)).length,1);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM easyopen_audit_events')).rows[0].count,before);
    assert.equal((await accounts.listUsers())[0].id,user.id);
  }finally{await orm.destroy();}
  class SlowMigration1999999999999{async up(runner){await runner.query('SELECT pg_sleep(2)');}async down(){}}
  const timeoutSource=new DataSource({type:'postgres',host:'127.0.0.1',port,username:'postgres',password,database:'postgres',migrations:[SlowMigration1999999999999],migrationsTableName:'easyopen_qa_timeout_migrations',logging:false});
  await timeoutSource.initialize();
  try{
    await assert.rejects(()=>applyMigrations(timeoutSource,100),error=>error.code==='57014');
    assert.equal((await db.query('SELECT count(*)::int AS count FROM easyopen_qa_timeout_migrations')).rows[0].count,0);
    assert.equal((await db.query('SELECT id FROM easyopen_users WHERE id=$1',[user.id])).rowCount,1);
  }finally{await timeoutSource.destroy();}
  const browserToken=await new SignJWT({sub:user.id,email:'qa@example.invalid'}).setProtectedHeader({alg:'HS256'}).setIssuer('easyopen-account-api').setAudience('easyopen').setExpirationTime('10m').sign(new TextEncoder().encode(secret));
  const serverEnv={...dbEnv,HOSTNAME:'127.0.0.1',PORT:'3001',EASYOPEN_API_ORIGIN:publicOrigin,EASYOPEN_WEB_ORIGIN:'https://easy-open.mano.io.kr',EASYOPEN_ADMIN_ORIGIN:publicOrigin,EASYOPEN_GOOGLE_CLIENT_ID:'qa',EASYOPEN_GOOGLE_CLIENT_SECRET:'qa-only',EASYOPEN_SESSION_SECRET:secret,EASYOPEN_ADMIN_EMAILS:'admin@example.invalid'};
  server=spawn(process.execPath,['dist/main.js'],{stdio:'ignore',env:serverEnv});
  web=spawn(process.execPath,['../api/node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','4284'],{cwd:new URL('../../api/',import.meta.url),stdio:'ignore',env:{...process.env,EASYOPEN_BACKEND_ORIGIN:'http://127.0.0.1:3001'}});
  ready=false;for(let i=0;i<80;i++){if(server.exitCode!==null||web.exitCode!==null)throw new Error('QA API failed to start');try{ready=(await request('/api/health')).ok;if(ready)break;}catch{}await delay(250);}assert.ok(ready);
  const start=async()=>{const r=await post('/v1/auth/device/start',{platform:'desktop'});assert.equal(r.status,200);return r.json();};
  const approve=(code,extra={})=>request('/workspace/connect/approve',{method:'POST',headers:{origin:publicOrigin,cookie:'easyopen_session='+browserToken,...extra},body:new URLSearchParams({userCode:code})});
  for(const path of ['/workspace','/workspace/purchases','/workspace/connect','/admin'])assert.equal((await request(path)).status,200);
  for(const path of ['/workspace','/workspace/purchases','/workspace/connect','/admin','https://attacker.invalid']){
    const r=await request('/v1/auth/google/start?returnTo='+encodeURIComponent(path));assert.equal(r.status,307);
    const location=new URL(r.headers.get('location'));assert.equal(location.origin,'https://accounts.google.com');assert.equal(location.searchParams.get('redirect_uri'),publicOrigin+'/v1/auth/google/callback');
    const state=location.searchParams.get('state');const payload=JSON.parse(Buffer.from(state.split('.')[1],'base64url').toString());assert.equal(payload.returnTo,path.startsWith('/')?path:'https://easy-open.mano.io.kr');
    const cookie=r.headers.get('set-cookie');for(const flag of ['Secure','HttpOnly','SameSite=Lax'])assert.ok(cookie.includes(flag));
    const denied=await request('/v1/auth/google/callback?error=access_denied&state='+state,{headers:{cookie:'easyopen_oauth_state='+state}});assert.equal(denied.status,400);assert.equal((await denied.json()).error,'google_authorization_denied');
  }
  for(const path of ['/workspace/logout','/admin/logout','/v1/auth/logout']){
    assert.equal((await request(path,{method:'POST',headers:{origin:'https://attacker.invalid'}})).status,403);
    const response=await request(path,{method:'POST',headers:{origin:publicOrigin}});assert.equal(response.status,path==='/v1/auth/logout'?200:303);assert.ok(response.headers.get('set-cookie').includes('easyopen_session=;'));
    if(response.status===303)assert.equal(new URL(response.headers.get('location')).origin,publicOrigin);
  }
  assert.equal((await post('/v1/auth/device/start',{platform:'shell'})).status,400);
  const pending=await start();assert.equal((await post('/v1/auth/device/exchange',{deviceCode:pending.deviceCode})).status,400);
  const slow=await post('/v1/auth/device/exchange',{deviceCode:pending.deviceCode});assert.equal(slow.status,429);assert.equal((await slow.json()).error,'slow_down');
  const a=await start();
  assert.equal((await approve(a.userCode,{origin:'https://attacker.invalid'})).status,403);
  assert.equal((await approve(a.userCode,{cookie:''})).status,401);
  assert.equal((await approve(a.userCode)).status,200);
  assert.equal((await approve(a.userCode)).status,400);
  const results=await Promise.all([post('/v1/auth/device/exchange',{deviceCode:a.deviceCode}),post('/v1/auth/device/exchange',{deviceCode:a.deviceCode})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
  const token=(await results.find(r=>r.status===200).json()).token;
  const stored=(await db.query('SELECT token_hash FROM easyopen_device_sessions')).rows[0].token_hash;assert.equal(stored,hash(token));assert.notEqual(stored,token);
  const headers={authorization:'Bearer '+token};const account=await request('/v1/auth/device/session',{headers});assert.equal(account.status,200);assert.deepEqual(await account.json(),{email:'qa@example.invalid',entitlements:[]});
  assert.equal((await request('/v1/auth/device/session',{method:'DELETE',headers})).status,200);
  assert.equal((await request('/v1/auth/device/session',{headers})).status,401);
  assert.equal((await request('/v1/auth/device/session',{headers:{authorization:'Bearer '+browserToken}})).status,401);
  const expired=await start();await db.query("UPDATE easyopen_device_requests SET expires_at=now()-interval '1 second' WHERE device_hash=$1",[hash(expired.deviceCode)]);
  assert.equal((await approve(expired.userCode)).status,400);assert.equal((await post('/v1/auth/device/exchange',{deviceCode:expired.deviceCode})).status,400);
  const b=await start();assert.equal((await approve(b.userCode)).status,200);const bToken=(await (await post('/v1/auth/device/exchange',{deviceCode:b.deviceCode})).json()).token;await db.query("UPDATE easyopen_device_sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1",[hash(bToken)]);assert.equal((await request('/v1/auth/device/session',{headers:{authorization:'Bearer '+bToken}})).status,401);
  const adminUser=(await db.query("INSERT INTO easyopen_users(google_subject,email) VALUES('qa-admin','admin@example.invalid') RETURNING id")).rows[0];
  const adminToken=await new SignJWT({sub:adminUser.id,email:'admin@example.invalid'}).setProtectedHeader({alg:'HS256'}).setIssuer('easyopen-account-api').setAudience('easyopen').setExpirationTime('10m').sign(new TextEncoder().encode(secret));
  const adminHeaders={cookie:'easyopen_session='+adminToken,origin:publicOrigin,'content-type':'application/json'};
  assert.equal((await request('/v1/admin/users',{headers:adminHeaders})).status,200);
  assert.equal((await request('/v1/admin/users',{headers:{authorization:'Bearer '+token}})).status,403);
  const grantPath='/v1/admin/users/'+user.id+'/entitlements/commercial:cosyvoice-studio';
  assert.equal((await request(grantPath,{method:'PUT',headers:{...adminHeaders,origin:'https://attacker.invalid'},body:JSON.stringify({active:true})})).status,403);
  for(const active of [true,false])assert.equal((await request(grantPath,{method:'PUT',headers:adminHeaders,body:JSON.stringify({active})})).status,200);
  const billing=await post('/v1/billing/checkout-sessions',{},adminHeaders);assert.equal(billing.status,503);assert.equal((await billing.json()).error,'billing_provider_not_configured');
  const records=(await db.query('SELECT device_hash,user_code_hash FROM easyopen_device_requests')).rows;assert.ok(!JSON.stringify(records).includes(a.deviceCode));assert.ok(!JSON.stringify(records).includes(a.userCode));
  const loggedIn=await request('/workspace/purchases',{headers:{cookie:'easyopen_session='+browserToken}});assert.equal(loggedIn.status,200);assert.ok((await loggedIn.text()).includes('qa@example.invalid'));
  const adminDenied=await request('/v1/admin/users',{headers:{cookie:'easyopen_session='+browserToken}});assert.equal(adminDenied.status,403);
  const fakeState=await request('/v1/auth/google/callback?code=unused&state=malformed',{headers:{cookie:'easyopen_oauth_state=malformed'}});assert.equal(fakeState.status,400);
  if(process.env.EASYOPEN_UI_NODE){const result=await exec(process.env.EASYOPEN_UI_NODE,['scripts/verify-workspace-ui.mjs'],{cwd:new URL('../../../',import.meta.url),env:{...process.env,EASYOPEN_API_NODE:process.execPath},timeout:60000});console.log(result.stdout.trim());}
  console.log('PASS: migration, pending/slow polling, authenticated approval, CSRF rejection, concurrent single-use exchange, hashed storage, account/entitlements, revocation and expiry.');
}finally{
  if(web){web.kill('SIGTERM');await new Promise(resolve=>{if(web.exitCode!==null)return resolve();web.once('exit',resolve);});}
  if(server){server.kill('SIGTERM');await new Promise(resolve=>{if(server.exitCode!==null||web.exitCode!==null)return resolve();server.once('exit',resolve);});}
  if(db)await db.end();
  if(created){const {stdout}=await exec(docker,['inspect','--format','{{index .Config.Labels "kr.io.mano.easyopen.qa"}}',name]);if(stdout.trim()!==name)throw new Error('Refusing to remove unowned QA container');await exec(docker,['rm','-f','-v',name]);}
}
