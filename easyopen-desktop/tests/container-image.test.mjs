import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const dockerfile=readFileSync(new URL('../../easyopen-containers/cosyvoice/Dockerfile',import.meta.url),'utf8');
const entrypoint=readFileSync(new URL('../../easyopen-containers/cosyvoice/entrypoint.py',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../../.github/workflows/easyopen-container-image.yml',import.meta.url),'utf8');
const releaseWorkflow=readFileSync(new URL('../../.github/workflows/easyopen-desktop-release.yml',import.meta.url),'utf8');
const validateWorkflow=readFileSync(new URL('../../.github/workflows/easyopen-validate.yml',import.meta.url),'utf8');

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
  assert.match(dockerfile,/numpy==1\.26\.4/);
  assert.match(dockerfile,/--no-build-isolation --no-deps openai-whisper==20231117/);
  assert.match(dockerfile,/--no-cache-dir -r requirements\.txt/);
  assert.doesNotMatch(dockerfile,/--no-build-isolation -r requirements\.txt/);
  assert.doesNotMatch(dockerfile,/\n\s+pip install/);
  assert.ok(dockerfile.indexOf('numpy==1.26.4')<dockerfile.indexOf('--no-build-isolation --no-deps openai-whisper'));
  assert.ok(dockerfile.indexOf('WORKDIR /opt/CosyVoice')<dockerfile.indexOf('-r requirements.txt'));
});

test('실행 이미지는 빌드 도구를 제외한 CUDA runtime 단계로 분리하고 보안 업데이트한다',()=>{
  assert.match(dockerfile,/FROM nvidia\/cuda:12\.4\.1-cudnn-devel-ubuntu22\.04 AS builder/);
  assert.match(dockerfile,/FROM nvidia\/cuda:12\.4\.1-cudnn-runtime-ubuntu22\.04/);
  assert.match(dockerfile,/apt-get update && apt-get upgrade -y/);
  assert.match(dockerfile,/COPY --from=builder \/opt\/conda \/opt\/conda/);
  const runtime=dockerfile.slice(dockerfile.indexOf('FROM nvidia/cuda:12.4.1-cudnn-runtime'));
  assert.doesNotMatch(runtime,/build-essential|git-lfs|linux-libc-dev/);
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

test('대형 이미지 검사는 runner 공간을 확보하고 로드된 이미지는 보존한다',()=>{
  const build=workflow.indexOf('Build candidate for security checks');
  const prune=workflow.indexOf('Release BuildKit cache before image scan');
  const scan=workflow.indexOf('Record HIGH and CRITICAL vulnerability report');
  assert.ok(build>0&&prune>build&&scan>prune);
  assert.match(workflow,/sudo rm -rf \/usr\/local\/lib\/android \/usr\/share\/dotnet \/opt\/ghc/);
  assert.match(workflow,/docker builder prune --all --force/);
  assert.doesNotMatch(workflow,/docker image prune/);
  assert.equal(workflow.match(/scanners: vuln/g)?.length,2);
  assert.equal(workflow.match(/timeout: 30m0s/g)?.length,2);
  assert.match(workflow,/id: vulnerability-scan\n\s+continue-on-error: true/);
  assert.match(workflow,/output: trivy-report\.txt\n\s+exit-code: "1"/);
  assert.match(workflow,/steps\.vulnerability-scan\.outcome != 'success'/);
});

test('자동 검증과 수동 배포 워크플로를 이름과 trigger로 구분한다',()=>{
  assert.match(validateWorkflow,/name: "\[AUTO\] EasyOpen · Validate"/);
  assert.match(validateWorkflow,/\n  push:/);
  assert.match(releaseWorkflow,/name: "\[MANUAL\] EasyOpen · Release Desktop\/Android apps"/);
  assert.match(releaseWorkflow,/\n  workflow_dispatch:/);
  assert.doesNotMatch(releaseWorkflow,/\n  push:/);
  assert.match(workflow,/name: "\[MANUAL\] EasyOpen · Build\/Publish CosyVoice image"/);
  assert.doesNotMatch(workflow,/\n  push:/);
});
