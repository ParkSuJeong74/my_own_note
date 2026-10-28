import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const main = readFileSync(new URL('../electron/main.ts', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../../../../.github/workflows/easyopen-desktop-release.yml', import.meta.url), 'utf8');

test('Windows 패키지와 창은 EasyOpen 제품 아이콘을 사용', () => {
  assert.equal(pkg.build.win.icon, 'build/icon.ico');
  assert.equal(pkg.build.nsis.installerIcon, 'build/icon.ico');
  assert.equal(pkg.build.nsis.uninstallerIcon, 'build/icon.ico');
  assert.ok(existsSync(new URL('../build/icon.svg', import.meta.url)));
  assert.ok(existsSync(new URL('../build/icon.ico', import.meta.url)));
  assert.ok(existsSync(new URL('../build/icon.png', import.meta.url)));
  assert.match(main, /icon:appIcon/);
});

test('공개 Windows 릴리스는 인증서와 Authenticode 검증을 요구', () => {
  assert.match(workflow, /WINDOWS_CERTIFICATE_BASE64/);
  assert.match(workflow, /WINDOWS_CERTIFICATE_PASSWORD/);
  assert.match(workflow, /WINDOWS_EXPECTED_PUBLISHER/);
  assert.match(workflow, /Get-AuthenticodeSignature/);
  assert.match(workflow, /Status -ne 'Valid'/);
});
