import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRemovalCommands,buildRuntimeArgs,detectRuntime} from '../electron/runtime.ts';

const app={containerName:'easyopen-cosyvoice',image:'ghcr.io/mano/cosyvoice@sha256:abc123',modelVolume:'easyopen-cosyvoice-models'};

test('앱 제거는 컨테이너를 항상 제거하고 모델은 명시적 선택에서만 제거',()=>{
  assert.deepEqual(buildRemovalCommands(app,{removeImage:false,removeModels:false}),[['rm','--force','easyopen-cosyvoice']]);
  assert.deepEqual(buildRemovalCommands(app,{removeImage:true,removeModels:true}),[
    ['rm','--force','easyopen-cosyvoice'],['image','rm','ghcr.io/mano/cosyvoice@sha256:abc123'],['volume','rm','easyopen-cosyvoice-models'],
  ]);
});

test('명령 인자로 사용할 수 없는 관리 대상 이름은 거절',()=>{
  assert.throws(()=>buildRemovalCommands({...app,containerName:'x && whoami'},{removeImage:false,removeModels:false}));
});

test('지원하지 않는 환경은 런타임이 준비됐다고 오인하지 않음',async()=>{
  assert.deepEqual(await detectRuntime('freebsd'),{wslInstalled:false,dockerInstalled:false,dockerRunning:false,dockerVersion:null});
});
test('Runtime 설치는 고정된 공식 명령만 사용',()=>{
  assert.deepEqual(buildRuntimeArgs('install-wsl'),{command:'wsl.exe',args:['--install','--no-distribution']});
  assert.deepEqual(buildRuntimeArgs('install-docker'),{command:'winget',args:['install','--id','Docker.DockerDesktop','--exact','--source','winget','--accept-package-agreements','--accept-source-agreements']});
  assert.throws(()=>buildRuntimeArgs('arbitrary'));
});
