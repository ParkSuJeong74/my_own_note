import test from 'node:test';
import assert from 'node:assert/strict';
import {JELLYFIN_MACOS_BLOCKED,JELLYFIN_WINDOWS_X64,assertManagedPath,isAllowedJellyfinRedirect,isAllowedJellyfinRuntimeUrl,jellyfinLaunchSpec,jellyfinRuntimePaths,selectJellyfinRuntime,validateJellyfinArchiveEntries} from '../electron/jellyfin-runtime.ts';

test('Windows x64만 검증된 관리형 Runtime 후보를 제공',()=>{
  assert.equal(selectJellyfinRuntime('win32','x64'),JELLYFIN_WINDOWS_X64);
  assert.equal(selectJellyfinRuntime('win32','arm64'),null);
  assert.equal(selectJellyfinRuntime('darwin','arm64'),null);
  assert.match(JELLYFIN_MACOS_BLOCKED.reason,/codesign/);
});

test('공식 Jellyfin 저장소의 고정 Windows ZIP만 원본 URL로 허용',()=>{
  assert.equal(isAllowedJellyfinRuntimeUrl(JELLYFIN_WINDOWS_X64.url),true);
  assert.equal(isAllowedJellyfinRuntimeUrl('https://repo.jellyfin.org/files/server/windows/latest-stable/amd64/jellyfin_13.0-amd64.zip'),false);
  assert.equal(isAllowedJellyfinRuntimeUrl('https://example.com/jellyfin_12.4-amd64.zip'),false);
});

test('리다이렉트는 Jellyfin 공식 미러 하위 HTTPS만 허용',()=>{
  assert.equal(isAllowedJellyfinRedirect('https://ams1.mirror.jellyfin.org/files/a.zip'),true);
  assert.equal(isAllowedJellyfinRedirect('http://ams1.mirror.jellyfin.org/files/a.zip'),false);
  assert.equal(isAllowedJellyfinRedirect('https://mirror.jellyfin.org.evil.example/a.zip'),false);
});

test('압축 파일은 경로 탈출을 거절하고 필수 Runtime 구성을 요구',()=>{
  const valid=['jellyfin/jellyfin.exe','jellyfin/ffmpeg.exe','jellyfin/ffprobe.exe','jellyfin/jellyfin-web/index.html'];
  assert.equal(validateJellyfinArchiveEntries(valid),true);
  assert.equal(validateJellyfinArchiveEntries([...valid,'../escape.exe']),false);
  assert.equal(validateJellyfinArchiveEntries(valid.filter(path=>!path.endsWith('ffmpeg.exe'))),false);
});

test('실행 명세는 EasyOpen 관리 폴더와 별도 데이터 경로만 사용',()=>{
  const paths=jellyfinRuntimePaths('C:\\Users\\test\\EasyOpen');
  const spec=jellyfinLaunchSpec('C:\\Users\\test\\EasyOpen');
  assert.equal(spec.command,paths.executable);
  assert.deepEqual(spec.args,['-d',paths.data,'-noautorunwebapp']);
  assert.throws(()=>assertManagedPath(paths.root,'/outside/jellyfin.exe'));
});
