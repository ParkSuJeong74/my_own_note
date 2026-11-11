import test from 'node:test';
import assert from 'node:assert/strict';
import {renderCask} from '../../../packaging/homebrew/render-cask.mjs';

test('서명·공증 DMG용 Homebrew Cask를 고정 GitHub Release URL로 생성',()=>{
  const sha='a'.repeat(64);const text=renderCask('0.1.1-beta.1',sha);
  assert.match(text,/cask "easyopen"/);
  assert.match(text,/easyopen-v#\{version\}\/EasyOpen-#\{version\}-arm64\.dmg/);
  assert.match(text,new RegExp(sha));
  assert.match(text,/depends_on arch: :arm64/);
});

test('Cask 생성기는 임의 URL·버전·해시 입력을 거절',()=>{
  assert.throws(()=>renderCask('../latest','a'.repeat(64)),/version/);
  assert.throws(()=>renderCask('0.1.1','not-a-sha'),/sha256/);
});
