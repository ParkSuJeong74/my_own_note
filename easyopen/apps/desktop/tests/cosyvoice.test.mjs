import test from 'node:test';
import assert from 'node:assert/strict';
import {COSYVOICE_CANDIDATE,evaluateCosyVoiceReadiness,parseNvidiaSmi,readinessBlockMessage} from '../electron/cosyvoice.ts';

test('CosyVoice 후보는 공식 GitHub code만 고정하고 모델 승인 전 상태를 유지',()=>{
  assert.match(COSYVOICE_CANDIDATE.commit,/^[0-9a-f]{40}$/);
  assert.equal(COSYVOICE_CANDIDATE.repository,'https://github.com/QwenAudio/CosyVoice');
  assert.equal(COSYVOICE_CANDIDATE.model,null);
  assert.equal(COSYVOICE_CANDIDATE.modelRevision,null);
  assert.equal(COSYVOICE_CANDIDATE.modelApproved,false);
  assert.equal(COSYVOICE_CANDIDATE.python,'3.11');
});

test('nvidia-smi 결과에서 GPU 정보를 안전하게 읽음',()=>{
  assert.deepEqual(parseNvidiaSmi('NVIDIA GeForce RTX 4070, 12282, 581.29\r\n'),{name:'NVIDIA GeForce RTX 4070',memoryMb:12282,driverVersion:'581.29'});
  assert.equal(parseNvidiaSmi('invalid output'),null);
  assert.equal(parseNvidiaSmi('GPU, nope, driver'),null);
});

test('하드웨어 조건을 통과해도 공식 GitHub 모델 승인 전에는 준비되지 않음',()=>{
  const ready=evaluateCosyVoiceReadiness({platform:'win32',memoryGb:32,freeDiskGb:50,gpu:{name:'RTX',memoryMb:8192,driverVersion:'1'},runtime:{wslInstalled:true,dockerInstalled:true,dockerRunning:true,dockerVersion:'29'}});
  assert.equal(ready.supported,false);
  assert.equal(ready.checks.find(check=>check.id==='source')?.ok,false);
  assert.match(readinessBlockMessage(ready),/공식 GitHub 모델/);
});

test('Windows가 아니거나 진단 누락이면 설치 준비로 오인하지 않음',()=>{
  const blocked=evaluateCosyVoiceReadiness({platform:'darwin',memoryGb:8,freeDiskGb:null,gpu:null,runtime:{wslInstalled:false,dockerInstalled:false,dockerRunning:false,dockerVersion:null}});
  assert.equal(blocked.supported,false);
  assert.deepEqual(blocked.checks.map(check=>check.ok),[false,false,false,false,false,false,false]);
  assert.match(readinessBlockMessage(blocked),/공식 GitHub 모델.*Windows 11.*메모리 16GB.*NVIDIA GPU/);
});
