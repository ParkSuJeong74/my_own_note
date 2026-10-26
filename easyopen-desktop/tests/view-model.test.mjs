import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleApps, catalogSummary, statusText, getActionLabel} from '../src/view-model.ts';

const apps = [
  {id:'cosyvoice',name:'CosyVoice',summary:'AI 음성',category:'AI',os:['windows'],install:{windows:{method:'official-link',validated:false}}},
  {id:'obs',name:'OBS Studio',summary:'화면 녹화',category:'영상',os:['windows'],install:{windows:{method:'winget',packageId:'OBSProject.OBSStudio',validated:false}}},
  {id:'localsend',name:'LocalSend',summary:'파일 전송',category:'파일',os:['windows','android'],install:{windows:{method:'winget',packageId:'LocalSend.LocalSend',validated:false}}},
  {id:'android',name:'AndroidOnly',summary:'휴대폰',category:'파일',os:['android'],install:{}},
];
const states={obs:'installed',localsend:'not-installed',cosyvoice:'unknown'};
const updates={obs:'available'};

test('탐색은 Windows 지원 앱만 보이고 검색·카테고리 필터 작동',()=>{
  assert.deepEqual(visibleApps(apps,'discover','','전체',states,[]).map(a=>a.id),['cosyvoice','obs','localsend']);
  assert.deepEqual(visibleApps(apps,'discover','  녹화  ','전체',states,[]).map(a=>a.id),['obs']);
  assert.deepEqual(visibleApps(apps,'discover','','파일',states,[]).map(a=>a.id),['localsend']);
});
test('설치된 앱은 감지된 앱만 표시하고 알 수 없음은 제외',()=>{
  assert.deepEqual(visibleApps(apps,'installed','','전체',states,[]).map(a=>a.id),['obs']);
  assert.deepEqual(visibleApps(apps,'installed','','전체',{},[]),[]);
});
test('업데이트 탭은 WinGet에서 새 버전이 확인된 앱만 제공',()=>{
  assert.deepEqual(visibleApps(apps,'updates','','전체',states,[],updates).map(a=>a.id),['obs']);
  assert.equal(catalogSummary(apps,states,updates).updateAvailableCount,1);
  assert.equal(catalogSummary(apps,states).installedCount,1);
  assert.equal(catalogSummary(apps,states).unknownCount,1);
});
test('라이브러리는 저장한 항목만, 중복 ID 무관',()=>{
  assert.deepEqual(visibleApps(apps,'library','','전체',states,['localsend','localsend','android']).map(a=>a.id),['localsend']);
});
test('작업 센터는 카탈로그 목록 필터로 사용하지 않음',()=>{
  assert.deepEqual(visibleApps(apps,'tasks','','전체',states,[]),[]);
  assert.deepEqual(visibleApps(apps,'runtime','','전체',states,[]),[]);
});
test('미리보기는 설치 감지됨이나 설치 완료로 오인되지 않는다',()=>{
  assert.match(statusText('unknown',false),/미리보기/);
  assert.match(statusText('unknown',true),/확인 불가/);
  assert.equal(getActionLabel(apps[0],'unknown',true),'공식 사이트');
  assert.equal(getActionLabel(apps[1],'installed',true),'업데이트 시도');
  assert.equal(getActionLabel(apps[1],'not-installed',false),'공식 사이트');
});
