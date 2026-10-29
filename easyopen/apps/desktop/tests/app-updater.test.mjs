import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=url=>readFileSync(url,'utf8');
const updater=read(new URL('../electron/app-updater.ts',import.meta.url));
const main=read(new URL('../electron/main.ts',import.meta.url));
const preload=read(new URL('../electron/preload.ts',import.meta.url));
const workflow=read(new URL('../../../../.github/workflows/easyopen-desktop-release.yml',import.meta.url));
const pkg=JSON.parse(read(new URL('../package.json',import.meta.url)));

test('서명된 패키지에서만 앱 내부 업데이트를 활성화',()=>{
  assert.match(main,/app\.isPackaged/);
  assert.match(main,/easyopenUpdates===true/);
  assert.match(workflow,/extraMetadata\.easyopenUpdates=true/);
  assert.match(workflow,/extraMetadata\.easyopenUpdates=\$\{\{ inputs\.publish \}\}/);
  assert.match(updater,/autoUpdater\.autoDownload=false/);
  assert.match(updater,/autoUpdater\.allowPrerelease=true/);
});

test('업데이트 확인·진행률·재시작 설치 IPC를 제공',()=>{
  for(const channel of ['app-update-status','app-update-check','app-update-download','app-update-install'])assert.ok(main.includes(channel));
  for(const method of ['appUpdateStatus','checkAppUpdate','downloadAppUpdate','installAppUpdate','onAppUpdate'])assert.ok(preload.includes(method));
  assert.match(updater,/download-progress/);
  assert.match(updater,/quitAndInstall\(false,true\)/);
});

test('릴리스는 앱 버전과 정확히 일치하고 플랫폼별 업데이트 파일을 게시',()=>{
  assert.equal(pkg.version,'0.1.1-beta.1');
  assert.deepEqual(pkg.build.publish,[{provider:'github',owner:'ParkSuJeong74',repo:'my_own_note',channel:'beta',releaseType:'prerelease'}]);
  assert.match(workflow,/easyopen-v\$\{version\}/);
  assert.match(workflow,/Setup\.exe\.blockmap/);
  assert.match(workflow,/release\/\*\.yml/);
  assert.match(workflow,/arm64\.zip\.blockmap/);
  assert.match(workflow,/release\/\*-mac\.yml/);
});
