import {test} from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../src/catalog.generated.json' with {type:'json'};
import {androidApps, managedMobileApps, mobileCategories, filterMobileApps, getOfficialLink, publicMobileApps, toggleSaved, usesEasyOpenClient} from '../src/mobile-view-model.ts';

test('Android list excludes Windows-only CosyVoice',()=>{
  const list=androidApps(catalog);
  assert.ok(list.some(app=>app.id==='localsend'));
  assert.ok(!list.some(app=>app.id==='cosyvoice'));
});
test('공개 모바일 목록은 준비된 Jellyfin만 노출하고 후보 데이터는 유지',()=>{
  assert.deepEqual(publicMobileApps(catalog).map(app=>app.id),['jellyfin']);
  assert.ok(catalog.some(app=>app.id==='localsend'));
});
test('내 프로그램은 실제 Jellyfin 연결이 있을 때만 표시',()=>{
  assert.deepEqual(managedMobileApps(catalog,false),[]);
  assert.deepEqual(managedMobileApps(catalog,true).map(app=>app.id),['jellyfin']);
});
test('category list includes all, plus Android categories only',()=>{
  const result=mobileCategories(catalog);
  assert.equal(result[0],'전체');
  assert.ok(result.includes('파일 · 공유'));
  assert.ok(!result.includes('AI · 음성'));
});
test('search filters Android apps case-insensitively',()=>{
  const result=filterMobileApps(catalog,' LOCALsend ', '전체',[]);
  assert.deepEqual(result.map(app=>app.id),['localsend']);
});
test('saved filter does not return unselected programs',()=>{
  assert.deepEqual(filterMobileApps(catalog,'','전체',['vlc'],true).map(x=>x.id),['vlc']);
  assert.equal(filterMobileApps(catalog,'','전체',[],true).length,0);
});
test('saved IDs toggle in both directions without mutation',()=>{
  const start=['localsend'];
  assert.deepEqual(toggleSaved(start,'vlc'),['localsend','vlc']);
  assert.deepEqual(toggleSaved(start,'localsend'),[]);
  assert.deepEqual(start,['localsend']);
});
test('official link uses approved https catalog source',()=>{
  const local=catalog.find(app=>app.id==='localsend');
  assert.ok(getOfficialLink(local)?.startsWith('https://play.google.com/'));
});
test('Jellyfin은 별도 앱으로 보내지 않고 EasyOpen 내부 클라이언트로 유지',()=>{
  const jellyfin=catalog.find(app=>app.id==='jellyfin');
  assert.equal(usesEasyOpenClient(jellyfin),true);
  assert.equal(getOfficialLink(jellyfin),null);
});
test('official link rejects unsafe protocols and unknown domains',()=>{
  const local=catalog.find(app=>app.id==='localsend');
  assert.equal(getOfficialLink({...local,install:{android:{method:'store',storeUrl:'javascript:alert(1)',validated:false}}}),null);
  assert.equal(getOfficialLink({...local,install:{android:{method:'store',storeUrl:'https://bad.example.com/app',validated:false}}}),null);
});
