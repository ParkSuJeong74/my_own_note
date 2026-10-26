import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const dockerfile=readFileSync(new URL('../../easyopen-containers/cosyvoice/Dockerfile',import.meta.url),'utf8');
const entrypoint=readFileSync(new URL('../../easyopen-containers/cosyvoice/entrypoint.py',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../../.github/workflows/easyopen-container-image.yml',import.meta.url),'utf8');

test('CosyVoice 이미지 소스와 모델은 검토한 commit/revision으로 고정',()=>{
  assert.match(dockerfile,/COSYVOICE_COMMIT=074ca6dc9e80a2f424f1f74b48bdd7d3fea531cc/);
  assert.match(dockerfile,/COSYVOICE_MODEL_REVISION=29e01c4e8d000f4bcd70751be16fa94bf3d85a18/);
  assert.doesNotMatch(dockerfile,/git checkout\s+(main|master)/);
  assert.match(entrypoint,/revision=os\.environ\["COSYVOICE_MODEL_REVISION"\]/);
});

test('의존성은 base Python이 아닌 CosyVoice Python 3.10 환경에 설치한다',()=>{
  assert.match(dockerfile,/PATH=\/opt\/conda\/envs\/cosyvoice\/bin:\/opt\/conda\/bin:/);
  assert.match(dockerfile,/conda create -y -n cosyvoice python=3\.10 pip/);
  assert.match(dockerfile,/\/opt\/conda\/envs\/cosyvoice\/bin\/python -m pip install/);
  assert.match(dockerfile,/setuptools==69\.5\.1/);
  assert.match(dockerfile,/--no-build-isolation -r requirements\.txt/);
  assert.doesNotMatch(dockerfile,/\n\s+pip install/);
});

test('CosyVoice Web UI는 고정 포트와 모델 volume 경로를 사용',()=>{
  assert.match(dockerfile,/COSYVOICE_MODEL_DIR=\/models\//);
  assert.match(dockerfile,/EXPOSE 50000/);
  assert.match(entrypoint,/"--port", "50000"/);
});

test('이미지 파이프라인은 검사 전 푸시를 막고 digest 증거를 만든다',()=>{
  assert.match(workflow,/workflow_dispatch:/);
  assert.match(workflow,/Restrict registry publishing to master/);
  const gate=workflow.indexOf('Reject fixed HIGH and CRITICAL vulnerabilities');
  const push=workflow.indexOf('Push verified image');
  assert.ok(gate>0&&push>gate);
  assert.match(workflow,/actions\/attest@v4/);
  assert.match(workflow,/cosign sign --yes "\$\{IMAGE\}@\$\{DIGEST\}"/);
  assert.match(workflow,/"cosyvoice": "%s@%s"/);
});
