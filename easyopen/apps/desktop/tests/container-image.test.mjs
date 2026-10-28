import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const normalizeText=value=>value.replace(/\r\n/g,'\n');
const readText=url=>normalizeText(readFileSync(url,'utf8'));
const dockerfile=readText(new URL('../../../containers/cosyvoice/Dockerfile',import.meta.url));
const entrypoint=readText(new URL('../../../containers/cosyvoice/entrypoint.py',import.meta.url));
const securityRequirements=readText(new URL('../../../containers/cosyvoice/security-requirements.txt',import.meta.url));
const trivyIgnore=readText(new URL('../../../containers/cosyvoice/.trivyignore.yaml',import.meta.url));
const workflow=readText(new URL('../../../../.github/workflows/easyopen-container-image.yml',import.meta.url));
const releaseWorkflow=readText(new URL('../../../../.github/workflows/easyopen-desktop-release.yml',import.meta.url));
const validateWorkflow=readText(new URL('../../../../.github/workflows/easyopen-validate.yml',import.meta.url));
const desktopPackage=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const jellyfinLock=JSON.parse(readFileSync(new URL('../../../containers/jellyfin/image-lock.json',import.meta.url),'utf8'));
const jellyfinReadme=readText(new URL('../../../containers/jellyfin/README.md',import.meta.url));
const catalogContainerImages=JSON.parse(readFileSync(new URL('../../catalog/container-images.json',import.meta.url),'utf8'));
const desktopContainerImages=JSON.parse(readFileSync(new URL('../resources/container-images.json',import.meta.url),'utf8'));
const jellyfinVerifyWorkflow=readText(new URL('../../../../.github/workflows/easyopen-jellyfin-verify.yml',import.meta.url));
const jellyfinPublishWorkflow=readText(new URL('../../../../.github/workflows/easyopen-jellyfin-publish.yml',import.meta.url));

test('Jellyfin upstream 이미지 잠금과 배포 manifest가 같은 digest를 사용',()=>{
  const image=`${jellyfinLock.repository}@${jellyfinLock.digest}`;
  assert.equal(jellyfinLock.source,'upstream');
  assert.equal(jellyfinLock.tagChecked,'12.2');
  assert.deepEqual(jellyfinLock.platforms,['linux/amd64','linux/arm64']);
  assert.equal(catalogContainerImages.jellyfin,image);
  assert.equal(desktopContainerImages.jellyfin,image);
  assert.match(jellyfinReadme,/공식 multi-architecture 이미지를/);
  assert.match(jellyfinReadme,/Dockerfile.*없는 것이 의도된 구조/s);
  assert.match(jellyfinReadme,/read-only bind mount/);
});

test('Jellyfin push 검증과 수동 GHCR candidate 게시를 분리',()=>{
  assert.match(jellyfinVerifyWorkflow,/name: "\[AUTO\] EasyOpen · Verify Jellyfin Supply Chain"/);
  assert.match(jellyfinVerifyWorkflow,/\n  push:/);
  assert.match(jellyfinVerifyWorkflow,/\n  pull_request:/);
  assert.match(jellyfinVerifyWorkflow,/permissions:\n  contents: read/);
  assert.match(jellyfinVerifyWorkflow,/linux\/amd64/);
  assert.match(jellyfinVerifyWorkflow,/linux\/arm64/);
  assert.match(jellyfinVerifyWorkflow,/jellyfin-amd64\.cdx\.json/);
  assert.match(jellyfinVerifyWorkflow,/jellyfin-arm64\.cdx\.json/);
  assert.doesNotMatch(jellyfinVerifyWorkflow,/packages: write/);
  assert.match(jellyfinPublishWorkflow,/name: "\[MANUAL\] EasyOpen · Publish Jellyfin Candidate"/);
  assert.match(jellyfinPublishWorkflow,/\n  workflow_dispatch:/);
  assert.doesNotMatch(jellyfinPublishWorkflow,/\n  push:/);
  assert.match(jellyfinPublishWorkflow,/PUBLISH_JELLYFIN_CANDIDATE/);
  assert.match(jellyfinPublishWorkflow,/packages: write/);
  assert.match(jellyfinPublishWorkflow,/imagetools create/);
  assert.match(jellyfinPublishWorkflow,/cosign sign --yes/);
});

test('텍스트 기반 구성 검사는 Windows CRLF를 LF로 정규화한다',()=>{
  assert.equal(normalizeText('first\r\nsecond\r\n'),'first\nsecond\n');
});

test('CosyVoice 이미지 소스와 모델은 검토한 commit/revision으로 고정',()=>{
  assert.match(dockerfile,/COSYVOICE_COMMIT=074ca6dc9e80a2f424f1f74b48bdd7d3fea531cc/);
  assert.match(dockerfile,/COSYVOICE_MODEL_REVISION=29e01c4e8d000f4bcd70751be16fa94bf3d85a18/);
  assert.doesNotMatch(dockerfile,/git checkout\s+(main|master)/);
  assert.match(entrypoint,/revision=os\.environ\["COSYVOICE_MODEL_REVISION"\]/);
});

test('의존성은 base Python이 아닌 CosyVoice Python 3.11 환경에 설치한다',()=>{
  assert.match(dockerfile,/PATH=\/opt\/conda\/envs\/cosyvoice\/bin:\/opt\/conda\/bin:/);
  assert.match(dockerfile,/conda create -y -n cosyvoice python=3\.11 pip/);
  assert.match(dockerfile,/\/opt\/conda\/envs\/cosyvoice\/bin\/python -m pip install/);
  assert.match(dockerfile,/setuptools==84\.0\.0 wheel==0\.48\.0 numpy==1\.26\.4/);
  assert.match(dockerfile,/numpy==1\.26\.4/);
  assert.match(dockerfile,/-r \/opt\/easyopen\/security-requirements\.txt/);
  assert.doesNotMatch(dockerfile,/-r requirements\.txt/);
  assert.doesNotMatch(dockerfile,/--no-build-isolation -r/);
  assert.doesNotMatch(dockerfile,/\n\s+pip install/);
  assert.ok(dockerfile.indexOf('WORKDIR /opt/CosyVoice')<dockerfile.indexOf('security-requirements.txt'));
});

test('보안 수정 의존성은 Python 3.11 환경에서 검증하고 Miniforge base 환경은 배포하지 않는다',()=>{
  assert.match(dockerfile,/conda create -y -n cosyvoice python=3\.11 pip/);
  assert.match(dockerfile,/security-requirements\.txt/);
  assert.match(dockerfile,/torch==2\.6\.0 torchaudio==2\.6\.0/);
  assert.match(dockerfile,/python -m pip check/);
  assert.match(dockerfile,/python -c "import diffusers, fastapi, gradio/);
  assert.match(dockerfile,/PIL, tiktoken, torch, torchaudio, transformers, whisper/);
  assert.match(dockerfile,/COPY --from=builder \/opt\/conda\/envs\/cosyvoice \/opt\/conda\/envs\/cosyvoice/);
  assert.doesNotMatch(dockerfile,/COPY --from=builder \/opt\/conda \/opt\/conda\s/);
  for(const expected of ['gradio==6.30.0','grpcio==1.82.0','grpcio-tools==1.82.0','openai-whisper==20250625','torch==2.6.0','pillow==12.3.0','pydantic==2.14.1','protobuf==6.33.5','transformers==5.10.0','python-multipart==0.0.30']){
    assert.match(`${dockerfile}\n${securityRequirements}`,new RegExp(expected.replaceAll('.','\\.')));
  }
  assert.match(securityRequirements,/setuptools==84\.0\.0/);
  assert.match(securityRequirements,/wheel==0\.48\.0/);
  assert.match(securityRequirements,/hydra-core==1\.3\.7/);
  assert.match(securityRequirements,/msgpack==1\.2\.3/);
  assert.match(dockerfile,/expected=\{'hydra-core':'1\.3\.7','msgpack':'1\.2\.3','setuptools':'84\.0\.0','urllib3':'2\.8\.0'\}/);
  for(const rejected of ['gradio==5.4.0','grpcio-tools==1.57.0','openai-whisper==20231117','torch==2.3.1','pillow==11.3.0','pydantic==2.7.0','transformers==4.51.3']){
    assert.doesNotMatch(securityRequirements,new RegExp(rejected.replaceAll('.','\\.')));
  }
});

test('실행 이미지는 빌드 도구를 제외한 CUDA runtime 단계로 분리하고 보안 업데이트한다',()=>{
  assert.match(dockerfile,/FROM nvidia\/cuda:12\.4\.1-cudnn-devel-ubuntu22\.04 AS builder/);
  assert.match(dockerfile,/FROM nvidia\/cuda:12\.4\.1-cudnn-runtime-ubuntu22\.04/);
  assert.match(dockerfile,/apt-get update && apt-get upgrade -y/);
  assert.match(dockerfile,/COPY --from=builder \/opt\/conda\/envs\/cosyvoice \/opt\/conda\/envs\/cosyvoice/);
  const runtime=dockerfile.slice(dockerfile.indexOf('FROM nvidia/cuda:12.4.1-cudnn-runtime'));
  assert.doesNotMatch(runtime,/build-essential|git-lfs|linux-libc-dev/);
});

test('CosyVoice Web UI는 고정 포트와 모델 volume 경로를 사용',()=>{
  assert.match(dockerfile,/COSYVOICE_MODEL_DIR=\/models\//);
  assert.match(dockerfile,/EXPOSE 50000/);
  assert.match(entrypoint,/"--port", "50000"/);
  assert.match(entrypoint,/os\.execv\(/);
  assert.doesNotMatch(entrypoint,/subprocess\.(run|Popen)/);
  assert.match(entrypoint,/모델 준비를 마쳤습니다/);
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
  assert.match(workflow,/trivyignores: easyopen\/containers\/cosyvoice\/\.trivyignore\.yaml/);
  assert.match(trivyIgnore,/pkg:pypi\/pillow@12\.3\.0/);
  assert.match(trivyIgnore,/expired_at: 2027-01-31/);
  assert.equal(trivyIgnore.match(/pkg:pypi\/pillow@12\.3\.0/g)?.length,28);
  assert.match(trivyIgnore,/pkg:pypi\/setuptools@70\.3\.0/);
});

test('자동 검증과 수동 배포 워크플로를 이름과 trigger로 구분한다',()=>{
  assert.match(validateWorkflow,/name: "\[AUTO\] EasyOpen · Validate"/);
  assert.match(validateWorkflow,/\n  push:/);
  assert.match(releaseWorkflow,/name: "\[MANUAL\] EasyOpen · Build\/Release Desktop\/Android apps"/);
  assert.match(releaseWorkflow,/\n  workflow_dispatch:/);
  assert.doesNotMatch(releaseWorkflow,/\n  push:/);
  assert.match(workflow,/name: "\[MANUAL\] EasyOpen · Build\/Publish CosyVoice image"/);
  assert.doesNotMatch(workflow,/\n  push:/);
});

test('Desktop과 Android는 명시적 publish에서만 태그와 prerelease를 만든다',()=>{
  assert.match(releaseWorkflow,/run-name: "\[MANUAL\] EasyOpen apps · publish=\$\{\{ inputs\.publish \}\}/);
  assert.match(releaseWorkflow,/publish:\n\s+description: "false: build artifacts only · true: create tag and prerelease"\n\s+required: true\n\s+default: false\n\s+type: boolean/);
  assert.match(releaseWorkflow,/contents: read/);
  assert.match(releaseWorkflow,/GitHub prerelease publishing is allowed only from refs\/heads\/master/);
  assert.match(releaseWorkflow,/prepare-release-assets:/);
  assert.match(releaseWorkflow,/name: easyopen-release-candidate-\$\{\{ needs\.release-metadata\.outputs\.release_tag \}\}/);
  assert.match(releaseWorkflow,/create-prerelease:\n\s+if: \$\{\{ inputs\.publish \}\}/);
  assert.match(releaseWorkflow,/create-prerelease:[\s\S]*?permissions:\n\s+contents: write/);
  assert.match(releaseWorkflow,/gh release view "\$RELEASE_TAG"/);
  assert.match(releaseWorkflow,/gh release create "\$RELEASE_TAG"/);
});

test('Windows 사용자 시험 설치 파일은 개발 호스트와 무관하게 x64로 패키징한다',()=>{
  assert.match(desktopPackage.scripts['package:win'],/electron-builder --win nsis --x64/);
  assert.match(releaseWorkflow,/run: npm run package:win/);
});

test('Android 내부 후보는 debug APK, 공개 후보는 release key로 분리한다',()=>{
  assert.match(releaseWorkflow,/name: Build internal debug APK\n\s+if: \$\{\{ !inputs\.publish \}\}/);
  assert.match(releaseWorkflow,/\.\/gradlew assembleDebug --no-daemon/);
  assert.match(releaseWorkflow,/name: Validate Android signing secrets\n\s+if: inputs\.publish/);
  assert.match(releaseWorkflow,/\.\/gradlew assembleRelease --no-daemon/);
  assert.match(releaseWorkflow,/internal-debug\.apk/);
});

test('macOS는 Apple Silicon DMG 패키징과 서명·공증 구성을 제공한다',()=>{
  assert.match(desktopPackage.scripts['package:mac'],/electron-builder --mac dmg --arm64/);
  assert.match(desktopPackage.scripts['package:mac:unsigned'],/CSC_IDENTITY_AUTO_DISCOVERY=false/);
  assert.deepEqual(desktopPackage.build.mac.target,['dmg']);
  assert.equal(desktopPackage.build.mac.artifactName,'EasyOpen-${version}-${arch}.${ext}');
  assert.equal(desktopPackage.build.mac.hardenedRuntime,true);
  assert.equal(desktopPackage.build.mac.notarize,true);
  assert.match(releaseWorkflow,/package-macos:/);
  assert.match(releaseWorkflow,/run: npm run package:mac/);
  assert.match(releaseWorkflow,/codesign --verify --deep --strict/);
  assert.match(releaseWorkflow,/xcrun stapler validate/);
});

test('GitHub 밖 모델 의존성이 남으면 CosyVoice 이미지 게시를 차단',()=>{
  assert.match(workflow,/Enforce GitHub-only runtime assets/);
  assert.match(workflow,/huggingface\|modelscope/);
  assert.match(workflow,/image publishing is blocked/);
});
