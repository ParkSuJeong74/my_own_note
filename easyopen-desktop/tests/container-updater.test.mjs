import test from 'node:test';
import assert from 'node:assert/strict';
import {replaceContainerImage} from '../electron/container-updater.ts';

const spec=image=>({id:'cosyvoice',containerName:'easyopen-cosyvoice',image,ports:[{host:50000,container:50000}],volumes:[{name:'easyopen-cosyvoice-models',mount:'/models'}],gpu:true,healthUrl:'http://127.0.0.1:50000/'});
const previous=spec(`ghcr.io/parksujeong74/easyopen-cosyvoice@sha256:${'a'.repeat(64)}`);
const next=spec(`ghcr.io/parksujeong74/easyopen-cosyvoice@sha256:${'b'.repeat(64)}`);

test('업데이트는 관리 컨테이너 제거 후 새 digest를 설치하고 volume 명세를 보존한다',async()=>{
  const calls=[];const result=await replaceContainerImage({previous,next,remove:async name=>{calls.push(['remove',name]);return {ok:true,message:'removed'};},install:async value=>{calls.push(['install',value.image,value.volumes]);return {ok:true,message:'installed'};}});
  assert.equal(result.ok,true);
  assert.deepEqual(calls.map(call=>call[0]),['remove','install']);
  assert.deepEqual(calls[1][2],[{name:'easyopen-cosyvoice-models',mount:'/models'}]);
});

test('관리 컨테이너 제거 실패 시 새 이미지를 설치하지 않는다',async()=>{
  let installs=0;const result=await replaceContainerImage({previous,next,remove:async()=>({ok:false,message:'not managed'}),install:async()=>{installs++;return {ok:true,message:'installed'};}});
  assert.deepEqual(result,{ok:false,message:'not managed'});assert.equal(installs,0);
});

test('새 이미지 실패 시 이전 digest를 복구한다',async()=>{
  const images=[];const result=await replaceContainerImage({previous,next,remove:async()=>({ok:true,message:'removed'}),install:async value=>{images.push(value.image);return value.image===next.image?{ok:false,message:'새 이미지 실패'}:{ok:true,message:'restored'};}});
  assert.equal(result.ok,false);assert.match(result.message,/이전 CosyVoice 이미지로 복구/);assert.deepEqual(images,[next.image,previous.image]);
});

test('새 이미지와 이전 이미지가 모두 실패하면 복구 실패를 알린다',async()=>{
  const result=await replaceContainerImage({previous,next,remove:async()=>({ok:true,message:'removed'}),install:async()=>({ok:false,message:'health 실패'})});
  assert.equal(result.ok,false);assert.match(result.message,/이전 이미지 복구도 실패/);
});

