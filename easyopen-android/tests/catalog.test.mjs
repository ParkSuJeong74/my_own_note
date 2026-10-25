import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {fetchRemoteCatalog,validateCatalog} from '../src/catalog.ts';
const apps=JSON.parse(readFileSync(new URL('../../easyopen-catalog/apps.json',import.meta.url),'utf8'));
test('Android 카탈로그에는 공식 설치 경로가 있음',()=>{
 const android=apps.filter(x=>x.os.includes('android'));
 assert.ok(android.length>=3);
 for(const app of android){assert.ok(app.install.android?.storeUrl);const u=new URL(app.install.android.storeUrl);assert.equal(u.protocol,'https:');assert.ok(u.hostname==='play.google.com');assert.ok(app.install.android.packageName);}
});
test('소스 및 모델을 내장하거나 설치 검증으로 표시하지 않음',()=>{
 for(const app of apps){assert.notEqual(app.install.android?.validated,true)}
});
test('원격 Catalog 검증은 중복 ID와 비 HTTPS URL을 거절',()=>{
 assert.equal(validateCatalog(apps).length,apps.length);
 assert.throws(()=>validateCatalog([...apps,apps[0]]));
 assert.throws(()=>validateCatalog([{...apps[0],officialUrl:'http://example.com'}]));
});
test('원격 Catalog 조회는 정상 응답만 사용',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>({ok:true,json:async()=>apps});
  assert.equal((await fetchRemoteCatalog()).length,apps.length);
  globalThis.fetch=async()=>({ok:false,status:503});
  await assert.rejects(()=>fetchRemoteCatalog(),/HTTP 503/);
 }finally{globalThis.fetch=original}
});
