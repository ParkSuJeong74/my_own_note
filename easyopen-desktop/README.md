# EasyOpen Desktop (Windows beta)

Electron + React + TypeScript 데스크톱 MVP. **설치 패키지와 앱 실행은 Windows 실기기에서 검증되지 않았습니다.** 공개 배포 전 Windows 11 테스트, 코드 서명, 패키지 ID 검증이 필요합니다.

## 실행

```powershell
cd workspace/my_own_note/easyopen-desktop
npm install
npm test
npm run typecheck
npm run dev
```

`npm run build`는 정적 UI와 Electron main/preload 코드를 컴파일합니다. Windows PC에서 `npm run package:win`으로 NSIS 설치 파일을 빌드할 수 있지만 코드 서명 및 배포 검증은 별도입니다.

## UX 개편 (2026-10-26)

웹사이트형 소개 배너/카드 중심 UI를 홈·프로그램 탐색·내 프로그램·업데이트 수동 점검·보관함 중심으로 재구성했습니다. 홈에서는 설치 감지 상태가 먼저 보이고, 업데이트 탭은 실제 업데이트 확인 결과로 오인하지 않도록 설치된 WinGet 앱의 *수동 점검 대상*만 표시합니다. 화면 디자인과 IPC/설치 엔진은 분리되어 있습니다.

## 구현 범위

- 한국어 탐색 UI, 카테고리·검색, 앱 상세·공식 링크·한국어 첫 사용 안내
- 내 컴퓨터 CPU/RAM·OS 정보와 CosyVoice용 NVIDIA GPU·저장 공간·Runtime 준비 진단
- 정적 JSON 카탈로그를 패키징. 계정·백엔드·DB 없음
- Windows에서 `LocalSend`, `OBS Studio`, `HandBrake`의 WinGet ID를 이용한 *시험* 설치·상태 조회·업데이트·제거 명령
- 설치·업데이트·제거 전 확인 창, 개발용 로그 표시, 설치 작업 중 중복 실행 방지
- WSL2·Docker Desktop 필수 준비 화면과 EasyOpen 라벨 컨테이너의 시작·중지·재시작·로그·제거
- CosyVoice 후보 이미지 정의, digest allowlist, loopback Web UI, 모델 volume, 설치·health check 어댑터. 준비된 UI는 외부 브라우저 대신 격리된 EasyOpen 작업창에서 열며, `resources/container-images.json`에 검증된 digest가 없으면 설치는 비활성화
- 시스템 앱 직접 실행/완전한 복구/진행률 %/다운로드 서명 직접 검사 **미구현**

## 신뢰 모델

Electron renderer에서 Node 통합 비활성화·context isolation·sandbox 활성화. IPC는 고정 메서드만 호출. 패키지는 로컬 패키지 ID allowlist만 허용하며 쉘 없이 `winget` 인자로 실행. 보안 점검 후 서명된 정식 빌드로 배포해야 합니다.

컨테이너 이미지는 `repository@sha256:<digest>`만 허용하고 포트는 loopback에만 게시합니다. 현재 CosyVoice 이미지 소스는 `../easyopen-containers/cosyvoice/`에 있으나 아직 Windows 실기기 빌드·SBOM·취약점 검사·서명이 끝나지 않아 기본 이미지 목록은 비어 있습니다.

WinGet은 설치 프로그램 다운로드 검증과 매니페스트를 관리하지만 EasyOpen이 Windows 실기기에서 패키지 버전·설치 단계·데이터 보존을 검증했다는 뜻은 **아닙니다**.

## CosyVoice 후보 digest 등록

이미지 워크플로를 `publish=true`로 실행해 서명·검증까지 성공하면
`easyopen-cosyvoice-desktop-manifest-<SHA>` 아티팩트의 `container-images.json`을 받습니다. 임의 tag나
Actions 화면의 값을 직접 복사하지 말고 다음 명령으로 먼저 검사한 뒤 등록합니다.

```powershell
cd easyopen-desktop
npm run container-image:check -- C:\Users\me\Downloads\container-images.json
npm run container-image:set -- C:\Users\me\Downloads\container-images.json
npm test
npm run typecheck
npm run package:win
```

등록 명령은 `ghcr.io/parksujeong74/easyopen-cosyvoice@sha256:<64자리>` 한 항목만 허용합니다.
`resources/container-images.json` 변경을 확인한 새 Desktop 설치 파일에서만 CosyVoice 설치가 활성화됩니다.

## Windows 11 CosyVoice 후보 시험

테스트 PC는 NVIDIA GPU, RAM 16GB 이상, 시스템 드라이브 여유 공간 20GB 이상을 준비합니다. 현재
코드 서명 전 베타이므로 개인 테스트 PC에서만 진행합니다.

1. GitHub Release의 `SHA256SUMS.txt`와 설치 파일 해시를 비교합니다.
   `Get-FileHash .\EasyOpen-*-Setup.exe -Algorithm SHA256` 결과가 다르면 실행하지 않습니다.
2. EasyOpen을 설치하고 실행합니다. 게시자 경고가 표시됐는지 기록하되 경고 우회 방법을 배포 안내로
   일반화하지 않습니다.
3. Runtime 화면에서 WSL2와 Docker Desktop 상태를 확인합니다. 필요한 설치는 안내를 읽고 직접
   승인하며 재부팅 후 EasyOpen을 다시 실행합니다.
4. CosyVoice 상세의 여섯 준비 항목이 모두 `확인`인지 확인하고 설치를 누릅니다. 작업 센터에서
   이미지 다운로드 → 컨테이너 준비 → 시작 → 모델·Web UI 확인 단계를 관찰합니다.
5. 완료 후 `Web UI 열기`가 기본 브라우저의 `http://127.0.0.1:50000`만 여는지 확인합니다. 다른
   PC나 휴대폰에서 이 주소에 접근 가능하면 실패로 기록합니다.
6. 사전 제공 음색이 있으면 짧은 한국어 문장을 생성합니다. 참조 음성이 필요하면 본인의 음성 또는
   명시적 허락을 받은 자료만 사용하고 결과 파일은 브라우저 다운로드로 별도 보관합니다.
7. Runtime에서 중지 → 시작 → 재시작 → 로그 열기를 차례로 확인하고 Web UI가 다시 열리는지 봅니다.
8. 컨테이너를 제거한 뒤 모델 volume이 보존되는지 확인합니다. 모델·결과물 삭제와 Docker/WSL 제거는
   아직 같은 동작으로 취급하지 않습니다.

실패 시 화면 캡처, 실패 단계, Windows 버전, GPU 이름·VRAM, NVIDIA 드라이버 버전, 남은 디스크와
아래 명령 결과를 함께 기록합니다. 입력 문장과 참조 음성 같은 개인정보는 공유 로그에서 제거합니다.

```powershell
docker ps -a --filter "label=kr.io.mano.easyopen.managed=true"
docker logs --tail 200 --timestamps easyopen-cosyvoice
docker inspect easyopen-cosyvoice --format '{{json .State}}'
```

## 카탈로그 관리

`../easyopen-catalog/apps.json`만 직접 수정합니다. `npm run sync:catalog`가 `resources/catalog.json`을 생성합니다. 웹과 모바일 앱도 동일 파일을 읽도록 유지합니다.

## 유지보수 주의

- Windows에서 WinGet 사용 가능 여부 및 명령 출력을 검증하세요.
- WinGet의 지역화된 출력은 달라질 수 있어 상태 감지가 일부 실패할 수 있습니다. 확인 실패를 설치 안 됨으로 단정하지 않도록 향후 보강 필요.
- 개발 모드의 Vite 웹 UI는 보여주기용이며 실제 설치 동작은 Electron IPC에서만 가능합니다.
- 기존 사이트와 mano-admin은 변경하지 않았습니다.
