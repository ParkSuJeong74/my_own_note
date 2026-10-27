import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {fetchRemoteCatalog,validateCatalog} from '../src/catalog.ts';
const apps=JSON.parse(readFileSync(new URL('../../easyopen-catalog/apps.json',import.meta.url),'utf8'));
test('Android 카탈로그는 스토어 앱과 EasyOpen 내부 클라이언트를 구분',()=>{
 const android=apps.filter(x=>x.os.includes('android'));
 assert.ok(android.length>=3);
 for(const app of android){
  const install=app.install.android;
  assert.ok(install);
  if(install.method==='easyopen-client'){assert.equal(app.id,'jellyfin');assert.equal(install.storeUrl,undefined);continue;}
  assert.ok(install.storeUrl);const u=new URL(install.storeUrl);assert.equal(u.protocol,'https:');assert.ok(u.hostname==='play.google.com');assert.ok(install.packageName);
 }
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
