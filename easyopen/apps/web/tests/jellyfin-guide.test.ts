import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const guide = readFileSync(new URL('../src/app/guides/jellyfin/page.tsx', import.meta.url), 'utf8');
const about = readFileSync(new URL('../src/app/about/page.tsx', import.meta.url), 'utf8');
const download = readFileSync(new URL('../src/app/download/page.tsx', import.meta.url), 'utf8');
const detail = readFileSync(new URL('../src/app/apps/[slug]/page.tsx', import.meta.url), 'utf8');
const sitemap = readFileSync(new URL('../src/app/sitemap.ts', import.meta.url), 'utf8');
const opener = readFileSync(new URL('../src/components/OpenEasyOpenButton.tsx', import.meta.url), 'utf8');
const card = readFileSync(new URL('../src/components/AppCard.tsx', import.meta.url), 'utf8');

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

test('제품 소개와 주요 화면에서 Jellyfin 상세 사용 방법으로 연결한다', () => {
  for (const source of [about, download, detail, sitemap]) {
    assert.match(source, /\/guides\/jellyfin/);
  }
});

test('Jellyfin 실행은 앱 URL scheme을 시도하고 다운로드로 fallback한다', () => {
  assert.match(opener, /easyopen:\/\/apps\/jellyfin/);
  assert.match(opener, /window\.location\.assign\('\/download\/'\)/);
});

test('Jellyfin 외 지원 도구 카드는 상세 진입 없이 비활성화한다', () => {
  assert.match(card, /app\.slug==='jellyfin'/);
  assert.match(card, /aria-disabled="true"/);
  assert.match(card, /지원 예정/);
});
