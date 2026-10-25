import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const apps=JSON.parse(readFileSync(new URL('../../easyopen-catalog/apps.json',import.meta.url),'utf8'));
test('Android 카탈로그에는 공식 설치 경로가 있음',()=>{
 const android=apps.filter(x=>x.os.includes('android'));
 assert.ok(android.length>=3);
 for(const app of android){assert.ok(app.install.android?.storeUrl);const u=new URL(app.install.android.storeUrl);assert.equal(u.protocol,'https:');assert.ok(u.hostname==='play.google.com');assert.ok(app.install.android.packageName);}
});
test('소스 및 모델을 내장하거나 설치 검증으로 표시하지 않음',()=>{
 for(const app of apps){assert.notEqual(app.install.android?.validated,true)}
});
