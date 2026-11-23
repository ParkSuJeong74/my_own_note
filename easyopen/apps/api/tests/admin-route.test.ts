import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import test from 'node:test';
const page=readFileSync(new URL('../src/app/admin/page.tsx',import.meta.url),'utf8');
const start=readFileSync(new URL('../src/app/v1/auth/google/start/route.ts',import.meta.url),'utf8');
const callback=readFileSync(new URL('../src/app/v1/auth/google/callback/route.ts',import.meta.url),'utf8');
test('관리자 UI는 allowlist 인증 전 회원 목록을 조회하지 않는다',()=>{assert.match(page,/if\(!session\)return/);assert.match(page,/const admin=await requireAdmin\(\)/);assert.match(page,/if\(!admin\)return/);assert.ok(page.indexOf('const users=await listUsers()')>page.indexOf('if(!admin)return'));});
test('관리자 OAuth는 start와 callback에서 같은 복귀 allowlist를 사용',()=>{
 assert.ok(start.includes("authReturnPath(request.nextUrl.searchParams.get('returnTo'))"));
 assert.ok(callback.includes("authReturnPath(statePayload.returnTo)"));
 assert.ok(callback.includes("new URL(returnPath,config.apiOrigin)"));
});
