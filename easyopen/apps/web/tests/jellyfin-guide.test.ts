import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const guide = readFileSync(new URL('../src/app/guides/jellyfin/page.tsx', import.meta.url), 'utf8');
const guideIndex = readFileSync(new URL('../src/app/guides/page.tsx', import.meta.url), 'utf8');
const home = readFileSync(new URL('../src/app/page.tsx', import.meta.url), 'utf8');
const download = readFileSync(new URL('../src/app/download/page.tsx', import.meta.url), 'utf8');
const detail = readFileSync(new URL('../src/app/apps/[slug]/page.tsx', import.meta.url), 'utf8');
const sitemap = readFileSync(new URL('../src/app/sitemap.ts', import.meta.url), 'utf8');

test('Jellyfin 웹 가이드는 설치부터 Android 재생과 문제 해결까지 안내한다', () => {
  for (const text of ['EasyOpen 설치', 'Jellyfin 사용 준비', '첫 관리자 설정', '미디어 폴더', 'Android', '연결되지 않을 때', '비밀번호']) {
    assert.ok(guide.includes(text));
  }
});

test('macOS는 GitHub DMG 검증 실패와 우회 금지를 정확히 표시한다', () => {
  assert.match(guide, /macOS/);
  assert.match(guide, /검증 중/);
  assert.match(guide, /GitHub DMG 검증 차단/);
  assert.match(guide, /서명 우회 방식으로 대체하지 않습니다/);
});

test('주요 웹 화면과 sitemap에서 Jellyfin 가이드로 연결한다', () => {
  for (const source of [guideIndex, home, download, detail, sitemap]) {
    assert.match(source, /\/guides\/jellyfin/);
  }
});
