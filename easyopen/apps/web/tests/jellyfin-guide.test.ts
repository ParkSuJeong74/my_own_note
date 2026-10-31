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
const catalogModel = readFileSync(new URL('../src/lib/catalog.ts', import.meta.url), 'utf8');
const supportCatalog = readFileSync(new URL('../src/components/SupportProgramCatalog.tsx', import.meta.url), 'utf8');
const scrollTop = readFileSync(new URL('../src/components/ScrollToTopButton.tsx', import.meta.url), 'utf8');

test('Jellyfin 웹 가이드는 실제 플랫폼 상태와 연결·데이터 경계를 안내한다', () => {
  for (const text of ['EasyOpen 설치', '아직 사용할 수 없어요', '설치된 Jellyfin 확인 중', 'Android', '연결되지 않을 때', '비밀번호', '원본 영상', 'EasyOpen 다운로드']) {
    assert.ok(guide.includes(text));
  }
  assert.doesNotMatch(guide,/guide-jump|Jellyfin 안내 바로가기|DownloadPanel/);
});

test('Windows와 Mac의 실제 준비 상태를 쉬운 문장으로 표시한다', () => {
  assert.match(guide, /Mac에서 먼저 확인 중/);
  assert.match(guide, /설치된 Jellyfin 확인 중/);
  assert.match(guide, /Windows에서 EasyOpen이 Jellyfin을 준비하는 기능은 아직 사용할 수 없습니다/);
  assert.match(guide, /EasyOpen이 대신 설치하지는 않습니다/);
  assert.doesNotMatch(guide,/감지 구현|관리형 설치 비활성|Runtime 후보|딥링크/);
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
  assert.match(programData,/licenseTag:'오픈소스'/);
  assert.doesNotMatch(programData,/무료·오픈소스|무료 미디어 시스템|무료 프로그램/);
  assert.equal(programPage.match(/<OpenEasyOpenButton\/>/g)?.length,2);
  assert.equal(programPage.match(/\{program\.support\.label\}/g)?.length,1);
  assert.doesNotMatch(programPage,/현재 통합 기능은 테스트 중/);
  assert.doesNotMatch(programPage,/현재 EasyOpen 지원 범위|공식 정보 확인/);
  assert.match(programPage,/program-resources/);
});

test('공개 지원 도구 페이지는 데이터 삭제 없이 Jellyfin만 노출한다',()=>{
  assert.equal(catalogData.length,11);
  assert.equal(catalogData.find(app=>app.slug==='jellyfin')?.supportLabel,'테스트 중');
  assert.match(appsPage,/app\.slug==='jellyfin'/);
  assert.doesNotMatch(appsPage,/<Catalog/);
  assert.doesNotMatch(appsPage,/detail\.features/);
  assert.match(appsPage,/새로운 프로그램은 지원 준비가 되는 대로 추가됩니다/);
  assert.match(programData,/support:\{label:'테스트 중'/);
  assert.match(download,/Jellyfin 테스트 중/);
  for(const field of ['ProgramLicense','EasyOpenSupport','EasyOpenPricing'])assert.ok(catalogModel.includes(field));
  assert.match(catalogModel,/status:'not-announced'/);
  assert.match(supportCatalog,/items\.length>1/);
});

test('상단 헤더는 다운로드 진입을 제공하지 않는다', () => {
  assert.equal(header.match(/["']\/download\/["']/g)?.length ?? 0, 0);
  assert.doesNotMatch(header,/header-cta|다운로드 <span/);
  assert.doesNotMatch(header,/nav-download/);
});

test('긴 페이지는 접근 가능한 맨 위로 이동 버튼을 제공한다',()=>{
  assert.match(scrollTop,/window\.scrollY>480/);
  assert.match(scrollTop,/페이지 맨 위로 이동/);
  assert.match(scrollTop,/prefers-reduced-motion: reduce/);
  assert.match(scrollTop,/window\.scrollTo\(\{top:0/);
});

test('Jellyfin 실행은 앱 URL scheme을 시도하고 앱이 열리지 않으면 다운로드로 이동한다', () => {
  assert.match(opener, /easyopen:\/\/apps\/jellyfin/);
  assert.match(opener, /window\.location\.assign\(["']\/download\/["']\)/);
  assert.match(opener, /visibilitychange/);
  assert.match(opener, /window\.addEventListener\(["']blur["']/);
  assert.match(opener, /window\.addEventListener\(["']pagehide["']/);
  assert.match(opener, /document\.hasFocus\(\)/);
  assert.match(guide, /앱이 설치되어 있지 않으면 다운로드 페이지로 이동합니다/);
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
