import test from 'node:test';
import assert from 'node:assert/strict';
import {jellyfinMobileGuide} from '../src/jellyfin-guide.ts';

test('Android Jellyfin 가이드는 PC 준비부터 앱 내부 재생까지 안내',()=>{
  assert.deepEqual(jellyfinMobileGuide.map(step=>step.title),['PC에서 Jellyfin 시작','PC 주소 등록','Jellyfin 로그인','영상 골라서 재생']);
  assert.match(jellyfinMobileGuide[0].body,/같은 Wi-Fi/);
  assert.match(jellyfinMobileGuide[2].body,/비밀번호를 따로 수집하지/);
  assert.match(jellyfinMobileGuide[3].body,/PC 실행 상태, 같은 Wi-Fi, 주소/);
});
