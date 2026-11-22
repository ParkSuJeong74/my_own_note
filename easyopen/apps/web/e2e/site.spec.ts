import {expect,test} from '@playwright/test';

const pages=['/','/download/','/legal/'];
const release=[{tag_name:'easyopen-v0.1.0-beta.1',name:'EasyOpen beta',html_url:'https://github.com/ParkSuJeong74/my_own_note/releases/tag/easyopen-v0.1.0-beta.1',draft:false,prerelease:true,published_at:'2026-10-27T01:37:50Z',assets:[{name:'EasyOpen-0.1.0-Setup.exe',browser_download_url:'https://github.com/ParkSuJeong74/my_own_note/releases/download/easyopen-v0.1.0-beta.1/EasyOpen-0.1.0-Setup.exe',size:104292736,download_count:1},{name:'EasyOpen-0.1.0-arm64.dmg',browser_download_url:'https://github.com/ParkSuJeong74/my_own_note/releases/download/easyopen-v0.1.0-beta.1/EasyOpen-0.1.0-arm64.dmg',size:115171723,download_count:1},{name:'EasyOpen-Android-0.1.0-beta.1.apk',browser_download_url:'https://github.com/ParkSuJeong74/my_own_note/releases/download/easyopen-v0.1.0-beta.1/EasyOpen-Android-0.1.0-beta.1.apk',size:67807686,download_count:1},{name:'SHA256SUMS.txt',browser_download_url:'https://github.com/ParkSuJeong74/my_own_note/releases/download/easyopen-v0.1.0-beta.1/SHA256SUMS.txt',size:282,download_count:1}]}];

test.beforeEach(async({page})=>{await page.route('https://api.github.com/**',route=>route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(release)}))});

for(const path of pages)test(`${path} renders without JS errors or horizontal overflow`,async({page})=>{const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(path);await expect(page.locator('h1').first()).toBeVisible();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);expect(errors).toEqual([])});

test('home stays program-agnostic and leads clearly to download',async({page})=>{await page.goto('/');await expect(page.getByRole('heading',{name:/좋은 프로그램은/})).toBeVisible();await expect(page.getByRole('img',{name:/프로그램을 준비하고 관리/})).toBeVisible();await expect(page.getByText(/지원 프로그램은 앱 안에서 계속 바뀌고 늘어납니다/)).toBeVisible();await expect(page.getByText(/Jellyfin|CosyVoice/)).toHaveCount(0);await expect(page.getByRole('link',{name:'EasyOpen 다운로드'})).toHaveAttribute('href','/download/');await expect(page.locator('.download-callout a')).toHaveAttribute('href','/download/')});

test('header and footer only expose download and operating policy',async({page},testInfo)=>{await page.goto('/');await expect(page.locator('.site-header a[href="/download/"]')).toBeVisible();await expect(page.locator('.site-header a[href*="apps"],.footer a[href*="apps"],.footer a[href*="about"]')).toHaveCount(0);await expect(page.locator('.footer-grid > div:last-child a')).toHaveCount(2);if(testInfo.project.name==='mobile')await expect(page.locator('.header-download')).toHaveCSS('background-color','rgb(121, 101, 240)')});

test('download resolves verified release state after JavaScript runs',async({page})=>{await page.goto('/download/');await expect(page.getByText(/easyopen-v0.1.0-beta.1/)).toBeVisible();await expect(page.getByRole('link',{name:/GitHub 베타 파일/})).toHaveCount(2);await expect(page.getByRole('link',{name:/GitHub 베타 APK/})).toHaveCount(1);await expect(page.getByText(/Jellyfin|CosyVoice/)).toHaveCount(0);await expect(page.getByText('파일 공개 · 미검증')).toHaveCount(3)});

test('download API failure becomes explicit and never enables a file link',async({page})=>{await page.unrouteAll();await page.route('https://api.github.com/**',route=>route.fulfill({status:503,body:'unavailable'}));await page.goto('/download/');await expect(page.getByText(/다운로드 가능 여부를 추정하지 않습니다/)).toBeVisible();await expect(page.getByText('조회 실패')).toHaveCount(4);await expect(page.getByRole('link',{name:/GitHub 베타/})).toHaveCount(0)});

test('scrolling reveals an accessible return-to-top button',async({page})=>{await page.goto('/');const top=page.getByRole('button',{name:'페이지 맨 위로 이동'});await expect(top).not.toBeVisible();await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await expect(top).toBeVisible();await top.click();await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeLessThan(20)});

test('iPhone card stays visible before an IPA is published',async({page})=>{
 await page.goto('/download/');
 await expect(page.getByRole('heading',{name:'iPhone',exact:true})).toBeVisible();
 await expect(page.getByText('공개된 IPA 없음',{exact:true})).toBeVisible();
});
test('iPhone downloads a published IPA alongside existing OS files',async({page})=>{
 const tag='easyopen-ios-v0.1.1-beta.2';
 const root='https://github.com/ParkSuJeong74/my_own_note/releases';
 const name='EasyOpen-iOS-0.1.1-beta.2-unsigned.ipa';
 const url=root+'/download/'+tag+'/'+name;
 await page.route('https://api.github.com/**',route=>route.fulfill({json:[{
  ...release[0],tag_name:tag,html_url:root+'/tag/'+tag,
  assets:[{name,browser_download_url:url,size:123456,download_count:0}],
 },...release]}));
 await page.goto('/download/');
 await expect(page.getByRole('link',{name:/GitHub 테스트 IPA/})).toHaveAttribute('href',url);
 await expect(page.getByRole('link',{name:/GitHub 베타 APK/})).toBeVisible();
});
