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
const panel = readFileSync(new URL('../src/components/DownloadPanel.tsx', import.meta.url), 'utf8');
const legal = readFileSync(new URL('../src/app/legal/page.tsx', import.meta.url), 'utf8');
const programPage = readFileSync(new URL('../src/components/ProgramDetailPage.tsx', import.meta.url), 'utf8');
const programData = readFileSync(new URL('../src/data/program-details.ts', import.meta.url), 'utf8');
const appsPage = readFileSync(new URL('../src/app/apps/page.tsx', import.meta.url), 'utf8');
const catalogData = JSON.parse(readFileSync(new URL('../src/data/apps.json', import.meta.url), 'utf8')) as Array<{slug:string;supportLabel:string}>;

test('Jellyfin 웹 가이드는 실제 플랫폼 상태와 연결·데이터 경계를 안내한다', () => {
  for (const text of ['EasyOpen 설치', '관리형 설치 비활성', '공식 앱 감지', 'Android', '연결되지 않을 때', '비밀번호', '원본 미디어']) {
    assert.ok(guide.includes(text));
  }
});

test('Windows와 macOS의 실제 구현 상태를 정확히 표시한다', () => {
  assert.match(guide, /macOS/);
  assert.match(guide, /검증 중/);
  assert.match(guide, /Windows 관리형 설치는 현재 비활성화/);
  assert.match(guide, /EasyOpen이 DMG를 자동 설치하지 않습니다/);
});

test('Jellyfin 소개와 사용 가이드는 역할에 맞는 별도 경로로 분리한다', () => {
  assert.doesNotMatch(about, /Jellyfin/);
  assert.match(download, /\/apps\/jellyfin/);
  assert.match(detail, /ProgramDetailPage/);
  assert.match(sitemap, /\/apps\/jellyfin/);
  assert.match(sitemap, /\/guides\/jellyfin/);
  assert.match(programData,/guideHref:'\/guides\/jellyfin\/'/);
});

test('공통 프로그램 상세 템플릿은 소개·기능·스크린샷·사용 사례·지원·공식 링크·CTA를 제공한다',()=>{
  for(const value of ['program.introduction','program.features','program.screenshots','program.useCases','program.support','program.links','OpenEasyOpenButton'])assert.ok(programPage.includes(value));
  assert.match(programData,/https:\/\/jellyfin\.org\/assets\/images\/10\.8-home/);
});

test('공개 지원 도구 페이지는 데이터 삭제 없이 Jellyfin만 노출한다',()=>{
  assert.equal(catalogData.length,11);
  assert.equal(catalogData.find(app=>app.slug==='jellyfin')?.supportLabel,'테스트 중');
  assert.match(appsPage,/getApp\('jellyfin'\)/);
  assert.doesNotMatch(appsPage,/<Catalog/);
  assert.match(appsPage,/더 많은 오픈소스 프로그램도 순차적으로 지원할 예정입니다/);
  assert.match(programData,/support:\{label:'테스트 중'/);
  assert.match(download,/Jellyfin 테스트 중/);
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
  assert.match(card, /app\.supportLabel/);
});

test('다운로드 패널은 로딩·성공·빈 결과·실패를 구분하고 실패 시 다운로드를 활성화하지 않는다',()=>{
  for(const state of ["'loading'","'success'","'empty'","'error'"])assert.ok(panel.includes(state));
  assert.match(panel,/다운로드 가능 여부를 추정하지 않습니다/);
  assert.match(panel,/파일 공개와 실기기 지원은 별도 상태/);
});

test('정책 페이지는 임시 문구 없이 다운로드 출처와 신고 창구를 제공한다',()=>{
  assert.doesNotMatch(legal,/공개 전|추가해야 합니다/);
  assert.match(legal,/GitHub Releases/);
  assert.match(legal,/GitHub Issues/);
  assert.match(legal,/Cloudflare/);
});
