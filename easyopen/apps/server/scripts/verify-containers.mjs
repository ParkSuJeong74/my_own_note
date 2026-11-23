import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomBytes} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
if(process.env.EASYOPEN_DOCKER_QA!=='1')throw new Error('Set EASYOPEN_DOCKER_QA=1 for disposable container QA');
const exec=promisify(execFile),docker=process.env.EASYOPEN_QA_DOCKER||'docker';
const id='easyopen-stack-qa-'+Date.now(),containers=[],password=randomBytes(32).toString('hex');let network=false;
const run=async args=>(await exec(docker,args,{env:{...process.env,POSTGRES_PASSWORD:password,EASYOPEN_SESSION_SECRET:randomBytes(32).toString('hex'),PGPASSWORD:password},timeout:120000})).stdout.trim();
const label=['--label','kr.io.mano.easyopen.qa='+id];
const env=['--env','PGHOST=easyopen-postgres','--env','PGPORT=5432','--env','PGUSER=postgres','--env','PGDATABASE=postgres','--env','PGPASSWORD','--env','EASYOPEN_API_ORIGIN=https://easyopen-api.mano.io.kr','--env','EASYOPEN_WEB_ORIGIN=https://easy-open.mano.io.kr','--env','EASYOPEN_ADMIN_ORIGIN=https://easyopen-api.mano.io.kr','--env','EASYOPEN_GOOGLE_CLIENT_ID=qa-only','--env','EASYOPEN_GOOGLE_CLIENT_SECRET=qa-only','--env','EASYOPEN_SESSION_SECRET','--env','EASYOPEN_ADMIN_EMAILS=admin@example.invalid'];
const create=async(suffix,args)=>{const name=id+'-'+suffix;containers.push(name);await run(['run','--pull=never','-d','--name',name,...label,'--network',id,...args]);return name;};
try{
 await run(['network','create',...label,id]);network=true;
 const postgres=await create('db',['--network-alias','easyopen-postgres','--env','POSTGRES_PASSWORD','postgres:16.16-alpine@sha256:81e77a4833487b8132fe4b00bedd39dc3f74b8641e387f19312a48f7de218c2e']);
 let ready=false;for(let i=0;i<40;i++){try{await run(['exec',postgres,'pg_isready','-U','postgres']);ready=true;break;}catch{}await delay(500);}assert.ok(ready);
 await run(['run','--pull=never','--rm',...label,'--network',id,...env,'easyopen-account-server:qa','npm','run','migration:run']);
 const server=await create('server',['--network-alias','easyopen-server','--read-only','--tmpfs','/tmp:size=64m,mode=1777',...env,'easyopen-account-server:qa']);
 ready=false;for(let i=0;i<40;i++){try{await run(['exec',server,'wget','-q','-O','-','http://127.0.0.1:3001/api/health']);ready=true;break;}catch{}await delay(500);}assert.ok(ready);
 const web=await create('web',['--read-only','--tmpfs','/tmp:size=64m,mode=1777','-p','127.0.0.1::3000','--env','EASYOPEN_BACKEND_ORIGIN=http://easyopen-server:3001','easyopen-account-web:qa']);
 const port=(await run(['port',web,'3000/tcp'])).split(':').at(-1);const origin='http://127.0.0.1:'+port;
 ready=false;for(let i=0;i<40;i++){try{ready=(await fetch(origin+'/api/health')).ok;if(ready)break;}catch{}await delay(500);}assert.ok(ready);
 for(const path of ['/workspace','/workspace/purchases','/workspace/connect','/admin']){const r=await fetch(origin+path);assert.equal(r.status,200,path);}
 const r=await fetch(origin+'/v1/auth/device/start',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({platform:'desktop'})});assert.equal(r.status,200);const body=await r.json();assert.match(body.deviceCode,/^[a-f0-9]{64}$/);
 const metadata=JSON.parse(await run(['inspect',web]));assert.ok(!metadata[0].Config.Env.some(v=>/^(PGPASSWORD|EASYOPEN_SESSION_SECRET|EASYOPEN_GOOGLE_CLIENT_SECRET)=/.test(v)));
 console.log('PASS: production Docker images, read-only server/web, migration, health, internal proxy, SSR pages, device start and web secret isolation.');
}finally{
 for(const name of containers.reverse()){
  let owned;try{owned=await run(['inspect','--format','{{index .Config.Labels "kr.io.mano.easyopen.qa"}}',name]);}catch{continue;}
  if(owned!==id)throw new Error('Refusing to remove unowned QA container');await run(['rm','-f','-v',name]);
 }
 if(network){const owned=await run(['network','inspect','--format','{{index .Labels "kr.io.mano.easyopen.qa"}}',id]);if(owned!==id)throw new Error('Refusing to remove unowned QA network');await run(['network','rm',id]);}
}
