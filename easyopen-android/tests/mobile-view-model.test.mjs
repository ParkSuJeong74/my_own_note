import {test} from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../src/catalog.generated.json' with {type:'json'};
import {androidApps, mobileCategories, filterMobileApps, getOfficialLink, toggleSaved} from '../src/mobile-view-model.ts';

test('Android list excludes Windows-only CosyVoice',()=>{
  const list=androidApps(catalog);
  assert.ok(list.some(app=>app.id==='localsend'));
  assert.ok(!list.some(app=>app.id==='cosyvoice'));
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
test('official link rejects unsafe protocols and unknown domains',()=>{
  const local=catalog.find(app=>app.id==='localsend');
  assert.equal(getOfficialLink({...local,install:{android:{method:'store',storeUrl:'javascript:alert(1)',validated:false}}}),null);
  assert.equal(getOfficialLink({...local,install:{android:{method:'store',storeUrl:'https://bad.example.com/app',validated:false}}}),null);
});
