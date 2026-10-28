import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {containerAppSpec,cosyVoiceContainerSpec,jellyfinContainerSpec,loadCachedContainerImages,needsContainerUpdate,parseContainerImages,resolveContainerImages,saveCachedContainerImages} from '../electron/container-apps.ts';
import {validateContainerSpec} from '../electron/container-installer.ts';

const digest=`ghcr.io/parksujeong74/easyopen-cosyvoice@sha256:${'b'.repeat(64)}`;
const jellyfinDigest=`ghcr.io/jellyfin/jellyfin@sha256:${'c'.repeat(64)}`;

test('Jellyfin 명세는 공식 digest와 영속 volume, 읽기 전용 미디어만 허용',()=>{
  const spec=jellyfinContainerSpec(jellyfinDigest,'/Users/test/Videos');
  assert.ok(spec);
  assert.equal(validateContainerSpec(spec),spec);
  assert.deepEqual(spec.volumes,[{name:'easyopen-jellyfin-config',mount:'/config'},{name:'easyopen-jellyfin-cache',mount:'/cache'}]);
  assert.deepEqual(spec.binds,[{source:'/Users/test/Videos',mount:'/media',readOnly:true}]);
  assert.equal(containerAppSpec('jellyfin',{jellyfin:jellyfinDigest},{mediaPath:'/Users/test/Videos'}).image,jellyfinDigest);
  assert.throws(()=>jellyfinContainerSpec(`ghcr.io/other/jellyfin@sha256:${'c'.repeat(64)}`),/승인된/);
});

test('CosyVoice는 승인된 digest가 없으면 설치 명세를 만들지 않는다',()=>{
  assert.equal(cosyVoiceContainerSpec(undefined),null);
  assert.equal(containerAppSpec('cosyvoice',{}),null);
});

test('외부 모델 의존성이 남은 CosyVoice digest는 stale manifest에도 활성화하지 않는다',()=>{
  assert.equal(containerAppSpec('cosyvoice',{cosyvoice:digest}),null);
  const spec=cosyVoiceContainerSpec(digest);
  assert.ok(spec);
  assert.equal(validateContainerSpec(spec),spec);
  assert.deepEqual(spec.ports,[{host:50000,container:50000}]);
  assert.deepEqual(spec.volumes,[{name:'easyopen-cosyvoice-models',mount:'/models'}]);
  assert.equal(spec.gpu,true);
  assert.equal(spec.healthUrl,'http://127.0.0.1:50000/');
});

test('알 수 없는 앱 ID와 mutable tag는 허용하지 않는다',()=>{
  assert.equal(containerAppSpec('unknown',{cosyvoice:digest}),null);
  assert.throws(()=>validateContainerSpec(cosyVoiceContainerSpec('ghcr.io/mano-easyopen/cosyvoice:latest')));
});

test('원격 이미지 목록은 고정 GHCR digest 한 필드만 허용한다',()=>{
  assert.deepEqual(parseContainerImages(JSON.stringify({cosyvoice:digest})),{cosyvoice:digest});
  assert.deepEqual(parseContainerImages('{"cosyvoice":null}'),{cosyvoice:null});
  assert.deepEqual(parseContainerImages(JSON.stringify({jellyfin:jellyfinDigest})),{jellyfin:jellyfinDigest});
  assert.throws(()=>parseContainerImages(JSON.stringify({cosyvoice:'ghcr.io/other/image@sha256:'+('a'.repeat(64))})),/승인된/);
  assert.throws(()=>parseContainerImages(JSON.stringify({cosyvoice:digest,command:'docker run'})),/필드/);
});

test('원격 검증 실패 시 cache, cache가 없으면 bundled manifest를 사용한다',async()=>{
  const bundled={cosyvoice:null};const cached={cosyvoice:digest};
  const failedFetch=async()=>new Response('bad',{status:500});
  assert.deepEqual(await resolveContainerImages({bundled,cached,fetcher:failedFetch}),{images:cached,source:'cache'});
  assert.deepEqual(await resolveContainerImages({bundled,cached:null,fetcher:failedFetch}),{images:bundled,source:'bundled'});
  const remote=await resolveContainerImages({bundled,cached:null,fetcher:async()=>new Response(JSON.stringify({cosyvoice:digest}),{status:200})});
  assert.deepEqual(remote,{images:{cosyvoice:digest},source:'remote'});
});

test('배포 전 원격 목록에 새 필드가 없어도 번들 Jellyfin digest를 잃지 않는다',async()=>{
  const bundled={jellyfin:jellyfinDigest};
  const remote=await resolveContainerImages({bundled,cached:null,fetcher:async()=>new Response('{}',{status:200})});
  assert.deepEqual(remote,{images:bundled,source:'remote'});
  const revoked=await resolveContainerImages({bundled,cached:null,fetcher:async()=>new Response('{"jellyfin":null}',{status:200})});
  assert.deepEqual(revoked,{images:{jellyfin:null},source:'remote'});
});

test('마지막 정상 manifest cache와 digest 업데이트 여부를 검증한다',()=>{
  const directory=mkdtempSync(join(tmpdir(),'easyopen-container-images-'));const cachePath=join(directory,'cache.json');
  try{
    assert.equal(loadCachedContainerImages(cachePath),null);
    saveCachedContainerImages(cachePath,{cosyvoice:digest});
    assert.deepEqual(loadCachedContainerImages(cachePath),{cosyvoice:digest});
    assert.match(readFileSync(cachePath,'utf8'),/parksujeong74/);
    assert.equal(needsContainerUpdate(digest,digest),false);
    assert.equal(needsContainerUpdate(`ghcr.io/parksujeong74/easyopen-cosyvoice@sha256:${'a'.repeat(64)}`,digest),true);
  }finally{rmSync(directory,{recursive:true,force:true});}
});
