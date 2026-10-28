import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {prepareWindowsJellyfinRuntime} from '../electron/jellyfin-runtime-preparer.ts';

const content=Buffer.from('reviewed archive');
const sha256=createHash('sha256').update(content).digest('hex');
const candidate={platform:'win32',arch:'x64',version:'12.4',url:'https://repo.jellyfin.org/files/server/windows/stable/v12.4/amd64/jellyfin_12.4-amd64.zip',sha256,archiveRoot:'jellyfin',executable:'jellyfin.exe'};
const entries=['jellyfin/jellyfin.exe','jellyfin/ffmpeg.exe','jellyfin/ffprobe.exe','jellyfin/jellyfin-web/index.html'];

async function testRoot(){return mkdtemp(join(tmpdir(),'easyopen-jellyfin-'));}
function deps(options={signature:true,entries}){
  return {
    download:async(_url,target)=>{await writeFile(target,content);return {finalUrl:'https://fra2.mirror.jellyfin.org/files/server/windows/stable/v12.4/amd64/jellyfin_12.4-amd64.zip'};},
    extract:async(_archive,target)=>{for(const name of options.entries){const path=join(target,...name.split('/'));await mkdir(join(path,'..'),{recursive:true});await writeFile(path,'file');}return options.entries;},
    verifySignature:async()=>options.signature,
  };
}

test('검증된 ZIP만 버전별 관리 폴더로 원자적으로 준비',async()=>{
  const root=await testRoot();
  const progress=[];
  const result=await prepareWindowsJellyfinRuntime(root,candidate,deps(),value=>progress.push(value));
  assert.equal(result.version,'12.4');
  assert.equal(result.alreadyPrepared,false);
  assert.equal(await readFile(result.executable,'utf8'),'file');
  assert.deepEqual(progress.map(value=>value.stage),['checking','receiving','verifying','preparing','complete']);
});

test('Windows 서명이 유효하지 않으면 준비 결과를 남기지 않음',async()=>{
  const root=await testRoot();
  await assert.rejects(()=>prepareWindowsJellyfinRuntime(root,candidate,deps({signature:false,entries})),/서명이 유효하지/);
});

test('필수 파일이 없거나 경로 탈출 항목이 있으면 거절',async()=>{
  const root=await testRoot();
  await assert.rejects(()=>prepareWindowsJellyfinRuntime(root,candidate,deps({signature:true,entries:[...entries,'../escape.exe'].filter(name=>!name.endsWith('ffmpeg.exe'))})),/압축 구조/);
});

test('이미 준비된 Runtime도 매번 서명을 다시 확인',async()=>{
  const root=await testRoot();
  const prepared=await prepareWindowsJellyfinRuntime(root,candidate,deps());
  await assert.rejects(()=>prepareWindowsJellyfinRuntime(root,candidate,{...deps(),verifySignature:async path=>path!==prepared.executable}),/서명을 확인/);
});
