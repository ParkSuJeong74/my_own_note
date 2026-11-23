import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';

const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const {chromium} = require('@playwright/test');
const apiDirectory = fileURLToPath(new URL('../apps/api/', import.meta.url));
const desktopDirectory = fileURLToPath(new URL('../apps/desktop/', import.meta.url));
const servers = [];
let browser;

function start(directory, command, args) {
  const process = spawn(command, args, {cwd: directory, stdio: 'ignore'});
  servers.push(process);
  return process;
}

async function ready(url, process) {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (process.exitCode !== null) throw new Error('Preview server exited before becoming ready');
    try {
      if ((await fetch(url, {signal: AbortSignal.timeout(2000)})).ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error('Preview server timeout: ' + url);
}

async function doubleTextSize(page, selector = 'body *') {
  await page.evaluate(selector => {
    const sizes = Array.from(document.querySelectorAll(selector))
      .filter(element => element instanceof HTMLElement)
      .map(element => {
        const style = getComputedStyle(element);
        return {element, font: parseFloat(style.fontSize), line: parseFloat(style.lineHeight)};
      });
    for (const {element, font, line} of sizes) {
      element.style.fontSize = font * 2 + 'px';
      if (Number.isFinite(line)) element.style.lineHeight = line * 2 + 'px';
    }
  }, selector);
}

try {
  const apiNode = process.env.EASYOPEN_API_NODE || process.execPath;
  const api = start(apiDirectory, apiNode, [apiDirectory + '/node_modules/next/dist/bin/next', 'start', '-p', '4281']);
  const desktop = start(desktopDirectory, process.execPath, [desktopDirectory + '/node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4282', '--strictPort']);
  await Promise.all([
    ready('http://127.0.0.1:4281/workspace', api),
    ready('http://127.0.0.1:4282', desktop),
  ]);
  browser = await chromium.launch();
  let screens = 0;
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({viewport: {width, height: 1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const path of ['/workspace', '/workspace/programs', '/workspace/purchases']) {
      await page.goto('http://127.0.0.1:4281' + path);
      await page.locator('h1').waitFor();
      assert.equal(await page.locator('nav [aria-current="page"]').count(), 1);
      assert.equal(await page.locator('nav [aria-current="page"]').getAttribute('href'), path);
      await page.keyboard.press('Tab');
      assert.equal(await page.getByRole('link', {name: '본문으로 이동'}).evaluate(element => element === document.activeElement), true);
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#workspace-main').evaluate(element => element === document.activeElement), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Workspace overflow');
      if (path.endsWith('/purchases')) {
        assert.equal(await page.getByRole('link', {name: 'Google로 로그인'}).getAttribute('href'), '/v1/auth/google/start?returnTo=%2Fworkspace%2Fpurchases');
      }
      const primary = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--eo-primary').trim());
      assert.equal(primary, '#7258df');
      await doubleTextSize(page);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Workspace text resize');
      screens++;
    }
    assert.deepEqual(errors, []);
    await page.close();
  }

  const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://catalog.easy-open.mano.io.kr/**', route => route.abort());
  await page.goto('http://127.0.0.1:4282');
  await page.locator('.startup-splash').waitFor({state: 'hidden'});
  for (const name of ['프로그램 찾기', '내 프로그램', '설정']) {
    await page.getByRole('button', {name, exact: true}).first().click();
    assert.equal(await page.locator('.nav-link[aria-current="page"]').textContent(), name);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    screens++;
  }
  await page.getByRole('button', {name: '프로그램 찾기', exact: true}).first().click();
  const columns = await page.locator('.program-list').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
  assert.equal(columns, 2);
  await page.getByRole('button', {name: 'Jellyfin 상세 보기', exact: true}).click();
  await page.getByRole('heading', {name: 'Jellyfin', exact: true}).waitFor();
  const dialog = page.getByRole('dialog', {name: 'Jellyfin 상세 정보'});
  assert.equal(await dialog.locator('button').first().evaluate(element => element === document.activeElement), true);
  for (let index = 0; index < 24; index++) {
    await page.keyboard.press(index < 12 ? 'Tab' : 'Shift+Tab');
    assert.equal(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog[open]'))), true);
  }
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog[open]').count(), 0);
  assert.equal(await page.getByRole('button', {name: 'Jellyfin 상세 보기', exact: true}).evaluate(element => element === document.activeElement), true);
  await page.getByRole('textbox', {name: '프로그램 검색'}).fill('no-such-program');
  await page.getByRole('heading', {name: '검색 결과가 없어요'}).waitFor();
  await page.getByRole('textbox', {name: '프로그램 검색'}).fill('');
  await page.getByRole('button', {name: '설정', exact: true}).first().click();
  await page.getByRole('button', {name: /작업 기록/}).click();
  await page.getByRole('heading', {name: '아직 작업 기록이 없어요'}).waitFor();
  screens += 3;
  for (const width of [1024, 720, 400]) {
    await page.setViewportSize({width, height: 850});
    for (const name of ['프로그램 찾기', '내 프로그램', '설정']) {
      await page.getByRole('button', {name, exact: true}).first().click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Desktop reflow at ' + width);
      screens++;
    }
  }
  await page.setViewportSize({width: 720, height: 850});
  await page.getByRole('button', {name: '프로그램 찾기', exact: true}).first().click();
  await doubleTextSize(page);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Desktop text resize');
  await page.getByRole('button', {name: 'Jellyfin 상세 보기', exact: true}).click();
  await page.locator('dialog[open]').waitFor();
  await doubleTextSize(page, 'dialog[open] *');
  assert.equal(await page.locator('dialog[open]').evaluate(element => element.scrollWidth > element.clientWidth), false, 'Dialog overflow');
  await page.keyboard.press('Escape');
  screens += 2;
  assert.deepEqual(errors, []);
  console.log(screens + ' workspace/desktop screen checks passed; shared theme, navigation, cards and program detail passed.');
} finally {
  if (browser) await browser.close();
  for (const process of servers) process.kill();
}
