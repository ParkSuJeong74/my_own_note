import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import test from 'node:test';
const page=readFileSync(new URL('../src/app/admin/page.tsx',import.meta.url),'utf8');
const start=readFileSync(new URL('../src/app/v1/auth/google/start/route.ts',import.meta.url),'utf8');
const callback=readFileSync(new URL('../src/app/v1/auth/google/callback/route.ts',import.meta.url),'utf8');
test('관리자 UI는 allowlist 인증 전 회원 목록을 조회하지 않는다',()=>{assert.match(page,/if\(!session\)return/);assert.match(page,/const admin=await requireAdmin\(\)/);assert.match(page,/if\(!admin\)return/);assert.ok(page.indexOf('const users=await listUsers()')>page.indexOf('if(!admin)return'));});
test('관리자 OAuth는 허용된 내부 경로만 state에 저장하고 같은 origin의 admin으로 복귀',()=>{assert.match(start,/===\'\/admin\'\?\'\/admin\':config\.webOrigin/);assert.match(callback,/statePayload\.returnTo===\'\/admin\'\?`\$\{config\.adminOrigin\}\/admin`/);});
