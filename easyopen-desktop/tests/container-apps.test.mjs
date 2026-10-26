import test from 'node:test';
import assert from 'node:assert/strict';
import {containerAppSpec,cosyVoiceContainerSpec} from '../electron/container-apps.ts';
import {validateContainerSpec} from '../electron/container-installer.ts';

const digest=`ghcr.io/mano-easyopen/cosyvoice@sha256:${'b'.repeat(64)}`;

test('CosyVoice는 승인된 digest가 없으면 설치 명세를 만들지 않는다',()=>{
  assert.equal(cosyVoiceContainerSpec(undefined),null);
  assert.equal(containerAppSpec('cosyvoice',{}),null);
});

test('CosyVoice 명세는 GPU, loopback Web UI, 전용 모델 volume을 고정한다',()=>{
  const spec=containerAppSpec('cosyvoice',{cosyvoice:digest});
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
