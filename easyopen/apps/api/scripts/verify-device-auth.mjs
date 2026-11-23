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
let server,db,created=false;
const request=(path,options={})=>fetch(origin+path,{redirect:'manual',...options});
const post=(path,body,headers={})=>request(path,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
try{
  await exec(docker,['run','--pull=never','-d','--name',name,'--label','kr.io.mano.easyopen.qa='+name,'--env','POSTGRES_PASSWORD','-p','127.0.0.1::5432','postgres:16.16-alpine@sha256:81e77a4833487b8132fe4b00bedd39dc3f74b8641e387f19312a48f7de218c2e'],{env:{...process.env,POSTGRES_PASSWORD:password}});created=true;
  const {stdout}=await exec(docker,['port',name,'5432/tcp']);const port=Number(stdout.trim().split(':').at(-1));
  db=new pg.Pool({host:'127.0.0.1',port,user:'postgres',password,database:'postgres',connectionTimeoutMillis:1000});
  let ready=false;for(let i=0;i<40;i++){try{await db.query('SELECT 1');ready=true;break;}catch{}await delay(500);}assert.ok(ready);
  console.log('Isolated PostgreSQL '+(await db.query('SHOW server_version')).rows[0].server_version);
  for(const file of ['001-initial.sql','002-device-sessions.sql','002-device-sessions.sql'])await db.query(await readFile(new URL('../db/'+file,import.meta.url),'utf8'));
  const user=(await db.query("INSERT INTO easyopen_users(google_subject,email) VALUES('qa','qa@example.invalid') RETURNING id")).rows[0];
  const browserToken=await new SignJWT({sub:user.id,email:'qa@example.invalid'}).setProtectedHeader({alg:'HS256'}).setIssuer('easyopen-account-api').setAudience('easyopen').setExpirationTime('10m').sign(new TextEncoder().encode(secret));
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','4284'],{stdio:'ignore',env:{...process.env,PGHOST:'127.0.0.1',PGPORT:String(port),PGUSER:'postgres',PGPASSWORD:password,PGDATABASE:'postgres',EASYOPEN_API_ORIGIN:publicOrigin,EASYOPEN_WEB_ORIGIN:'https://easy-open.mano.io.kr',EASYOPEN_ADMIN_ORIGIN:publicOrigin,EASYOPEN_GOOGLE_CLIENT_ID:'qa',EASYOPEN_GOOGLE_CLIENT_SECRET:'qa-only',EASYOPEN_SESSION_SECRET:secret,EASYOPEN_ADMIN_EMAILS:'admin@example.invalid'}});
  ready=false;for(let i=0;i<80;i++){if(server.exitCode!==null)throw new Error('QA API failed to start');try{ready=(await request('/api/health')).ok;if(ready)break;}catch{}await delay(250);}assert.ok(ready);
  const start=async()=>{const r=await post('/v1/auth/device/start',{platform:'desktop'});assert.equal(r.status,200);return r.json();};
  const approve=(code,extra={})=>request('/workspace/connect/approve',{method:'POST',headers:{origin:publicOrigin,cookie:'easyopen_session='+browserToken,...extra},body:new URLSearchParams({userCode:code})});
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
  const records=(await db.query('SELECT device_hash,user_code_hash FROM easyopen_device_requests')).rows;assert.ok(!JSON.stringify(records).includes(a.deviceCode));assert.ok(!JSON.stringify(records).includes(a.userCode));
  console.log('PASS: migration, pending/slow polling, authenticated approval, CSRF rejection, concurrent single-use exchange, hashed storage, account/entitlements, revocation and expiry.');
}finally{
  if(server){server.kill('SIGTERM');await new Promise(resolve=>{if(server.exitCode!==null)return resolve();server.once('exit',resolve);});}
  if(db)await db.end();
  if(created){const {stdout}=await exec(docker,['inspect','--format','{{index .Config.Labels "kr.io.mano.easyopen.qa"}}',name]);if(stdout.trim()!==name)throw new Error('Refusing to remove unowned QA container');await exec(docker,['rm','-f','-v',name]);}
}
