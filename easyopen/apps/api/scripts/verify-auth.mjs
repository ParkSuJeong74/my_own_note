import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {SignJWT} from 'jose';
const origin='http://127.0.0.1:4283';
const secret='isolated-oauth-test-only-'.repeat(3);
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','4283'],{stdio:'ignore',env:{...process.env,EASYOPEN_API_ORIGIN:'https://easyopen-api.mano.io.kr',EASYOPEN_WEB_ORIGIN:'https://easy-open.mano.io.kr',EASYOPEN_ADMIN_ORIGIN:'https://easyopen-api.mano.io.kr',EASYOPEN_GOOGLE_CLIENT_ID:'local-test-client',EASYOPEN_GOOGLE_CLIENT_SECRET:'local-test-only',EASYOPEN_SESSION_SECRET:secret,EASYOPEN_ADMIN_EMAILS:'test@example.invalid'}});
const request=(path,options={})=>fetch(origin+path,{redirect:'manual',...options});
try{
  let ready=false;
  for(let attempt=0;attempt<80;attempt++){
    if(server.exitCode!==null)throw new Error('Isolated auth server exited');
    try{ready=(await request('/workspace')).ok;}catch{}
    if(ready)break;
    await delay(250);
  }
  assert.ok(ready,'isolated auth server ready');
  for(const returnTo of ['/workspace','/workspace/connect','/workspace/purchases','/admin','https://attacker.invalid']){
    const response=await request('/v1/auth/google/start?returnTo='+encodeURIComponent(returnTo));
    assert.equal(response.status,307);
    const location=new URL(response.headers.get('location'));
    assert.equal(location.origin,'https://accounts.google.com');
    assert.equal(location.searchParams.get('redirect_uri'),'https://easyopen-api.mano.io.kr/v1/auth/google/callback');
    const cookie=response.headers.get('set-cookie');
    for(const flag of ['HttpOnly','Secure','SameSite=lax'])assert.ok(cookie.includes(flag));
    const state=location.searchParams.get('state');
    const payload=JSON.parse(Buffer.from(state.split('.')[1],'base64url').toString());
    assert.equal(payload.returnTo,returnTo.startsWith('/')?returnTo:'https://easy-open.mano.io.kr');
    const denied=await request('/v1/auth/google/callback?error=access_denied&state='+state,{headers:{cookie:'easyopen_oauth_state='+state}});
    assert.equal(denied.status,400);
    assert.equal((await denied.json()).error,'google_authorization_denied');
    assert.ok(!denied.headers.get('set-cookie').includes('easyopen_session='));
  }
  const expired=await new SignJWT({nonce:'expired'}).setProtectedHeader({alg:'HS256'}).setIssuer('easyopen-account-api').setAudience('easyopen').setExpirationTime(1).sign(new TextEncoder().encode(secret));
  for(const state of ['tampered',expired]){
    const response=await request('/v1/auth/google/callback?code=unused&state='+state,{headers:{cookie:'easyopen_oauth_state='+state}});
    assert.equal(response.status,400);
    assert.equal((await response.json()).error,'invalid_oauth_state');
    assert.ok(response.headers.get('set-cookie').includes('easyopen_oauth_state=;'));
  }
  assert.equal((await request('/workspace/logout',{method:'POST',headers:{origin:'https://attacker.invalid'}})).status,403);
  const logout=await request('/workspace/logout',{method:'POST',headers:{origin:'https://easyopen-api.mano.io.kr'}});
  assert.equal(logout.status,303);
  assert.equal(new URL(logout.headers.get('location')).pathname,'/workspace');
  assert.ok(logout.headers.get('set-cookie').includes('easyopen_session=;'));
  assert.equal(new URL(logout.headers.get('location')).origin,'https://easyopen-api.mano.io.kr');
  for(const path of ['/admin/logout','/v1/auth/logout']){
    assert.equal((await request(path,{method:'POST',headers:{origin:'https://attacker.invalid'}})).status,403);
    assert.equal((await request(path,{method:'POST',headers:{origin:'https://easyopen-api.mano.io.kr'}})).status,path==='/admin/logout'?303:200);
  }
  console.log('PASS: OAuth redirects, safe destinations, cookies, cancellation, invalid/expired state and logout origin checks. No Google or database requests.');
}finally{
  server.kill('SIGTERM');
}
