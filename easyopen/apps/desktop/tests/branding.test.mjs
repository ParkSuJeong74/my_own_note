import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const main = readFileSync(new URL('../electron/main.ts', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../../../../.github/workflows/easyopen-desktop-release.yml', import.meta.url), 'utf8');
const dopplerExporter = readFileSync(new URL('../../../../.github/scripts/export-doppler-secrets.sh', import.meta.url), 'utf8');

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

test('릴리스 비밀값은 Doppler mano/prd 단일 config에서 필요한 키만 조회', () => {
  assert.match(workflow, /dopplerhq\/cli-action@v4/);
  assert.match(workflow, /secrets\.DOPPLER_TOKEN/);
  assert.doesNotMatch(workflow, /secrets\.(?:WINDOWS_CERTIFICATE|MAC_CSC|APPLE_|EASYOPEN_ANDROID)/);
  assert.match(dopplerExporter, /doppler secrets get "\$secret_name" --plain --project mano --config prd/);
  assert.match(dopplerExporter, /Doppler mano\/prd secret is missing or empty/);
});

test('웹에서 설치된 EasyOpen을 여는 URL scheme을 등록', () => {
  assert.deepEqual(pkg.build.protocols, [{name:'EasyOpen',schemes:['easyopen']}]);
  assert.match(main, /setAsDefaultProtocolClient\('easyopen'\)/);
  assert.match(main, /requestSingleInstanceLock/);
});
