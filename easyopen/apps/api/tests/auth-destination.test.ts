import assert from 'node:assert/strict';
import test from 'node:test';
import {authReturnPath} from '../src/lib/auth-destination.ts';
test('OAuth returns to the exact workspace or admin path',()=>{
  for(const path of ['/admin','/workspace/connect','/workspace','/workspace/programs','/workspace/purchases']) assert.equal(authReturnPath(path),path);
});
test('OAuth rejects external, encoded and unapproved return paths',()=>{
  for(const path of [null,undefined,'//evil.invalid','https://evil.invalid','/workspace/../admin','/workspace?next=evil','/workspace/%2e%2e/admin']) assert.equal(authReturnPath(path),null);
});
