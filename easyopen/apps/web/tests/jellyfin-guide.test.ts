import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const guide = readFileSync(new URL('../src/components/JellyfinUsageGuide.tsx', import.meta.url), 'utf8');
const about = readFileSync(new URL('../src/app/about/page.tsx', import.meta.url), 'utf8');
const download = readFileSync(new URL('../src/app/download/page.tsx', import.meta.url), 'utf8');
const detail = readFileSync(new URL('../src/app/apps/[slug]/page.tsx', import.meta.url), 'utf8');
const sitemap = readFileSync(new URL('../src/app/sitemap.ts', import.meta.url), 'utf8');
const opener = readFileSync(new URL('../src/components/OpenEasyOpenButton.tsx', import.meta.url), 'utf8');
const card = readFileSync(new URL('../src/components/AppCard.tsx', import.meta.url), 'utf8');
const header = readFileSync(new URL('../src/components/Header.tsx', import.meta.url), 'utf8');

test('Jellyfin 웹 가이드는 설치부터 Android 재생과 문제 해결까지 안내한다', () => {
  for (const text of ['EasyOpen 설치', 'Jellyfin 사용 준비', '첫 관리자 설정', '미디어 폴더', 'Android', '연결되지 않을 때', '비밀번호']) {
    assert.ok(guide.includes(text));
  }
});

test('macOS는 서명 검증 전 자동 설치 제한과 우회 금지를 정확히 표시한다', () => {
  assert.match(guide, /macOS/);
  assert.match(guide, /검증 중/);
  assert.match(guide, /설치 파일의 서명 확인이 완료되지 않아 자동 설치를 제한합니다/);
  assert.match(guide, /안전성 검사를 우회하도록 안내하지 않습니다/);
});

test('Jellyfin 사용 방법은 지원 도구 상세에만 포함한다', () => {
  assert.doesNotMatch(about, /Jellyfin/);
  assert.match(download, /\/apps\/jellyfin/);
  assert.match(detail, /JellyfinUsageGuide/);
  assert.match(sitemap, /\/apps\/jellyfin/);
  assert.doesNotMatch(sitemap, /\/guides\/jellyfin/);
});

test('상단 다운로드 진입은 주 버튼 하나만 제공한다', () => {
  assert.equal(header.match(/href="\/download\/"/g)?.length, 1);
});

test('Jellyfin 실행은 앱 URL scheme을 시도하고 실패 시 명시적 대체 경로를 제공한다', () => {
  assert.match(opener, /easyopen:\/\/apps\/jellyfin/);
  assert.doesNotMatch(opener, /window\.location\.assign\(["']\/download\/["']\)/);
  assert.match(opener, /설치 파일과 지원 상태 확인/);
});

test('Jellyfin 외 지원 도구 카드는 실행하지 않고 공식 출처를 제공한다', () => {
  assert.match(card, /app\.slug==='jellyfin'/);
  assert.match(card, /app\.official/);
  assert.match(card, /공식 출처 보기/);
  assert.match(card, /지원 예정/);
});
