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

try {
  const api = start(apiDirectory, apiDirectory + '/node_modules/.bin/next', ['start', '-p', '4281']);
  const desktop = start(desktopDirectory, desktopDirectory + '/node_modules/.bin/vite', ['preview', '--host', '127.0.0.1', '--port', '4282', '--strictPort']);
  await Promise.all([
    ready('http://127.0.0.1:4281/workspace', api),
    ready('http://127.0.0.1:4282', desktop),
  ]);
  browser = await chromium.launch();
  let screens = 0;
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({viewport: {width, height: 1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const path of ['/workspace', '/workspace/programs', '/workspace/purchases']) {
      await page.goto('http://127.0.0.1:4281' + path);
      await page.locator('h1').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Workspace overflow');
      if (path.endsWith('/purchases')) {
        assert.equal(await page.getByRole('link', {name: 'Google로 로그인'}).getAttribute('href'), '/v1/auth/google/start?returnTo=%2Fworkspace%2Fpurchases');
      }
      const primary = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--eo-primary').trim());
      assert.equal(primary, '#7258df');
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
  assert.deepEqual(errors, []);
  console.log(screens + ' workspace/desktop screen checks passed; shared theme, navigation, cards and program detail passed.');
} finally {
  if (browser) await browser.close();
  for (const process of servers) process.kill();
}
