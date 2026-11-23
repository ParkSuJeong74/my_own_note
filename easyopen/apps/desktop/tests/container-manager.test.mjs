import test from 'node:test';
import assert from 'node:assert/strict';
import {MANAGED_LABEL,actionArgs,inspectManagedArgs,listManagedArgs,logArgs,parseManagedContainers,runManagedContainerAction} from '../electron/container-manager.ts';

test('목록은 EasyOpen 관리 라벨이 true인 컨테이너만 조회',()=>{
  assert.deepEqual(listManagedArgs(),['ps','--all','--filter',`label=${MANAGED_LABEL}=true`,'--format','{{json .}}']);
});

test('관리 작업은 고정 Docker 하위 명령과 안전한 이름만 사용',()=>{
  assert.deepEqual(actionArgs('start','easyopen-cosyvoice'),['start','easyopen-cosyvoice']);
  assert.deepEqual(actionArgs('stop','easyopen-cosyvoice'),['stop','--time','15','easyopen-cosyvoice']);
  assert.deepEqual(actionArgs('restart','easyopen-cosyvoice'),['restart','--time','15','easyopen-cosyvoice']);
  assert.deepEqual(actionArgs('remove','easyopen-cosyvoice'),['rm','easyopen-cosyvoice']);
  assert.deepEqual(logArgs('easyopen-cosyvoice'),['logs','--tail','200','--timestamps','easyopen-cosyvoice']);
  assert.equal(inspectManagedArgs('easyopen-cosyvoice').at(-1),'easyopen-cosyvoice');
  for(const value of ['x && whoami','../other','name\nstop',''])assert.throws(()=>actionArgs('start',value));
});

test('Docker JSON lines를 관리 화면용 상태로 변환',()=>{
  const output='{"ID":"abc","Names":"easyopen-cosyvoice","Image":"ghcr.io/mano/cosy@sha256:123","Status":"Up 2 minutes","State":"running"}\n';
  assert.deepEqual(parseManagedContainers(output),[{id:'abc',name:'easyopen-cosyvoice',image:'ghcr.io/mano/cosy@sha256:123',status:'Up 2 minutes',state:'running'}]);
  assert.deepEqual(parseManagedContainers(''),[]);
  assert.throws(()=>parseManagedContainers('{"ID":"abc"}'));
});

test('제거는 정상 중지 뒤 컨테이너만 제거하고 데이터 volume은 보존',async()=>{
 const calls=[];
 const result=await runManagedContainerAction('remove','easyopen-jellyfin',async args=>{
  calls.push(args);return args[0]==='inspect'?'true':'done';
 });
 assert.equal(result.ok,true);
 assert.deepEqual(calls.map(args=>args[0]),['inspect','stop','rm']);
 assert.deepEqual(calls[1],['stop','--time','15','easyopen-jellyfin']);
 assert.deepEqual(calls[2],['rm','easyopen-jellyfin']);
 assert.equal(calls.some(args=>args.includes('--volumes')||args.includes('--force')||args[0]==='volume'),false);
});
test('정상 중지 실패 시 제거하지 않고 미관리 컨테이너는 변경하지 않는다',async()=>{
 const calls=[];
 const result=await runManagedContainerAction('remove','easyopen-jellyfin',async args=>{
  calls.push(args);if(args[0]==='stop')throw Error('stop timeout');return 'true';
 });
 assert.equal(result.ok,false);
 assert.deepEqual(calls.map(args=>args[0]),['inspect','stop']);
 const unmanaged=[];
 assert.equal((await runManagedContainerAction('remove','other',async args=>{unmanaged.push(args);return 'false'})).ok,false);
 assert.deepEqual(unmanaged.map(args=>args[0]),['inspect']);
});
