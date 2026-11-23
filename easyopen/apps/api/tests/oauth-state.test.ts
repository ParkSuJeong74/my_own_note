import assert from 'node:assert/strict';
import test from 'node:test';
import {validateOAuthState} from '../src/lib/oauth-state.ts';
import {signToken, secureCookie} from '../src/lib/session.ts';
const secret='local-test-only-'.repeat(4);
test('OAuth state requires matching cookie, signature, expiry and nonce',async()=>{
  const state=await signToken({nonce:'test-nonce',returnTo:'/workspace/purchases'},secret,'10m');
  assert.equal((await validateOAuthState(state,state,secret))?.returnTo,'/workspace/purchases');
  assert.equal(await validateOAuthState(null,state,secret),null);
  assert.equal(await validateOAuthState(state,undefined,secret),null);
  assert.equal(await validateOAuthState(state,'different',secret),null);
  assert.equal(await validateOAuthState(state,state,'wrong-secret'),null);
  const expired=await signToken({nonce:'expired'},secret,'-1s');
  assert.equal(await validateOAuthState(expired,expired,secret),null);
  const missing=await signToken({sub:'session-is-not-oauth-state'},secret,'10m');
  assert.equal(await validateOAuthState(missing,missing,secret),null);
  assert.equal(await validateOAuthState('malformed','malformed',secret),null);
});
test('OAuth cookies remain host-only, HTTPS and inaccessible to scripts',()=>{
  const options=secureCookie(600);
  assert.deepEqual(options,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:600});
  assert.equal('domain' in options,false);
});
