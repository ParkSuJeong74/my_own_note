import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const apps=JSON.parse(readFileSync(new URL('../../easyopen-catalog/apps.json',import.meta.url),'utf8'));
test('카탈로그 id 유일, URL https, 필수 앱',()=>{
 assert.ok(apps.some(a=>a.id==='cosyvoice'));
 assert.ok(apps.some(a=>a.id==='jellyfin'));
 assert.equal(new Set(apps.map(a=>a.id)).size,apps.length);
 for(const a of apps){assert.match(a.officialUrl,/^https:\/\//);assert.ok(a.licenseStatus);assert.ok(a.guide);}
});
test('Jellyfin은 네 플랫폼 EasyOpen 내부 계약과 검증 전 상태를 가진다',()=>{
 const app=apps.find(a=>a.id==='jellyfin');
 assert.deepEqual(app.os,['macos','windows','ios','android']);
 assert.equal(app.install.macos.method,'managed-server');
 assert.equal(app.install.windows.method,'managed-server');
 assert.equal(app.install.ios.method,'easyopen-client');
 assert.equal(app.install.android.method,'easyopen-client');
 for(const platform of app.os)assert.equal(app.install[platform].validated,false);
});
test('WinGet ID allowlist 형식만 수용',()=>{
 for(const a of apps){const w=a.install.windows;if(w?.method==='winget')assert.match(w.packageId,/^[A-Za-z0-9._-]+$/);}
});
test('모든 설치 검증은 명시적으로 false',()=>{
 for(const a of apps)for(const spec of Object.values(a.install))assert.equal(spec.validated,false);
});
