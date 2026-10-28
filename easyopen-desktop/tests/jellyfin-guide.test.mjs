import test from 'node:test';
import assert from 'node:assert/strict';
import {desktopJellyfinGuide} from '../src/jellyfin-guide.ts';

test('Windows Jellyfin 가이드는 준비부터 모바일 연결까지 네 단계',()=>{
  const guide=desktopJellyfinGuide('win32');
  assert.equal(guide.length,4);
  assert.deepEqual(guide.map(step=>step.title),['Jellyfin 사용 준비','첫 관리자 설정','미디어 폴더 연결','휴대폰에서 이어 보기']);
  assert.match(guide[2].body,/이동하거나 삭제하지/);
  assert.match(guide[3].body,/계정이나 비밀번호가 들어 있지/);
});

test('Mac 가이드는 검증 전 Runtime을 사용할 수 있다고 표시하지 않음',()=>{
  const guide=desktopJellyfinGuide('darwin');
  assert.match(guide[0].title,/지원 상태/);
  assert.match(guide[0].body,/검증이 끝나기 전/);
  assert.doesNotMatch(guide[0].body,/사용 준비를 마쳤/);
});
