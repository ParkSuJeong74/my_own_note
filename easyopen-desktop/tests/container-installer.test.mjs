import test from 'node:test';
import assert from 'node:assert/strict';
import {createArgs,explainInstallError,installContainerApp,pullArgs,validateContainerSpec,waitForHealth} from '../electron/container-installer.ts';

const spec={id:'test-app',containerName:'easyopen-test-app',image:`ghcr.io/mano/test@sha256:${'a'.repeat(64)}`,ports:[{host:18080,container:8080}],volumes:[{name:'easyopen-test-models',mount:'/models'}],gpu:true,healthUrl:'http://127.0.0.1:18080/health'};

test('이미지는 tag가 아닌 sha256 digest를 필수로 사용',()=>{
  assert.equal(validateContainerSpec(spec),spec);
  assert.deepEqual(pullArgs(spec),['pull',spec.image]);
  assert.throws(()=>validateContainerSpec({...spec,image:'ghcr.io/mano/test:latest'}));
});

test('컨테이너 생성은 관리 라벨·loopback 포트·명시적 volume만 사용',()=>{
  const args=createArgs(spec);
  assert.deepEqual(args.slice(0,7),['create','--name','easyopen-test-app','--label','kr.io.mano.easyopen.managed=true','--label','kr.io.mano.easyopen.app-id=test-app']);
  assert.ok(args.includes('127.0.0.1:18080:8080'));
  assert.ok(args.includes('easyopen-test-models:/models'));
  assert.ok(args.includes('--gpus'));
});

test('외부 health check와 위험한 경로·포트를 거절',async()=>{
  assert.throws(()=>validateContainerSpec({...spec,healthUrl:'http://example.com:18080/health'}));
  assert.throws(()=>validateContainerSpec({...spec,volumes:[{name:'safe',mount:'/models/../host'}]}));
  await assert.rejects(()=>waitForHealth('https://example.com'),/외부/);
});

test('설치 성공은 pull-create-start-health 순서',async()=>{
  const calls=[];const logs=[];const progress=[];const result=await installContainerApp(spec,async args=>{calls.push(args);return '';},async()=>true,message=>logs.push(message),undefined,value=>progress.push(value));
  assert.equal(result.ok,true);
  assert.deepEqual(calls.map(args=>args[0]),['pull','create','start']);
  assert.equal(logs.length,4);
  assert.match(logs.at(-1),/준비를 확인/);
  assert.deepEqual(progress.map(value=>[value.stage,value.percent]),[['pull',10],['create',55],['start',70],['health',85],['complete',100]]);
});

test('생성 후 실패하면 컨테이너만 제거하고 volume은 보존',async()=>{
  const calls=[];const result=await installContainerApp(spec,async args=>{calls.push(args);return '';},async()=>false);
  assert.equal(result.ok,false);
  assert.deepEqual(calls.map(args=>args[0]),['pull','create','start','rm']);
  assert.equal(calls.some(args=>args[0]==='volume'),false);
});

test('생성 실패는 같은 이름의 기존 컨테이너를 제거하지 않는다',async()=>{
  const calls=[];const result=await installContainerApp(spec,async args=>{
    calls.push(args);
    if(args[0]==='create')throw new Error('Conflict. The container name "/easyopen-test-app" is already in use');
    return '';
  },async()=>true);
  assert.equal(result.ok,false);
  assert.match(result.message,/이전에 남은 CosyVoice 컨테이너/);
  assert.deepEqual(calls.map(args=>args[0]),['pull','create']);
});

test('Docker 원문 대신 사용자가 해결할 수 있는 설치 오류를 안내',()=>{
  assert.match(explainInstallError(new Error('write /tmp/layer: no space left on device')),/20GB/);
  assert.match(explainInstallError(new Error('Bind for 127.0.0.1:50000 failed: port is already allocated')),/포트/);
  assert.match(explainInstallError(new Error('could not select device driver "" with capabilities: [[gpu]]')),/NVIDIA GPU/);
  assert.match(explainInstallError(new Error('pull access denied, repository does not exist')),/접근 권한/);
  assert.match(explainInstallError(new Error('TLS handshake timeout')),/네트워크/);
  assert.match(explainInstallError(new Error('컨테이너가 시작됐지만 health check에 실패했습니다.')),/Runtime 로그/);
  assert.doesNotMatch(explainInstallError(new Error('secret-token-value')),/secret-token-value/);
});

test('생성 명령 중 취소는 소유권이 확인되지 않은 컨테이너를 제거하지 않는다',async()=>{
  const calls=[];const controller=new AbortController();
  const runner=async(args,_timeout,signal)=>{calls.push(args);if(args[0]==='create')await new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});});return '';};
  const operation=installContainerApp(spec,runner,async()=>true,()=>{},controller.signal);
  setTimeout(()=>controller.abort(),5);
  const result=await operation;
  assert.deepEqual(result,{ok:false,message:'사용자가 설치를 취소했습니다.'});
  assert.deepEqual(calls.map(args=>args[0]),['pull','create']);
  assert.equal(calls.some(args=>args[0]==='volume'),false);
});
