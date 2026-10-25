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

## GitHub Releases 베타 배포

EasyOpen 경로가 포함된 PR은 `.github/workflows/easyopen-validate.yml`에서 두 앱을 검증합니다.
PR을 `master`에 병합하면 통합 릴리스 워크플로가 NSIS EXE와 Android의 서명된 APK,
`SHA256SUMS.txt`를 공개 GitHub prerelease에 자동 첨부합니다.

자동 태그는 `easyopen-v<package-version>-beta.<Actions run number>` 형식입니다. 필요할 때는
Actions 화면에서 `easyopen-v0.1.0-beta.1` 같은 태그로 수동 실행할 수도 있습니다. 태그의
기본 버전은 Desktop `package.json`의 `version`과 일치해야 합니다.

현재 워크플로는 코드 서명 인증서가 없는 unsigned Windows beta를 **prerelease**로 공개하므로
정식판 배포에 사용하지 않습니다. Windows 11에서 설치·실행·업데이트·제거·복구를 검증하고
Windows 코드 서명을 추가한 뒤 stable/latest 자동 공개로 전환합니다.

## 구현 범위

- 한국어 탐색 UI, 카테고리·검색, 앱 상세·공식 링크·한국어 첫 사용 안내
- 내 컴퓨터 CPU/RAM·OS 정보 (GPU/저장 공간 세부 진단은 **미구현**)
- 정적 JSON 카탈로그를 패키징. 계정·백엔드·DB 없음
- Windows에서 `LocalSend`, `OBS Studio`, `HandBrake`의 WinGet ID를 이용한 *시험* 설치·상태 조회·업데이트·제거 명령
- 설치·업데이트·제거 전 확인 창, 개발용 로그 표시, 설치 작업 중 중복 실행 방지
- CosyVoice, Whisper 등은 현재 공식 설치 가이드 제공, 전용 설치 엔진은 아직 미구현
- 시스템 앱 직접 실행/완전한 복구/진행률 %/다운로드 서명 직접 검사 **미구현**

## 신뢰 모델

Electron renderer에서 Node 통합 비활성화·context isolation·sandbox 활성화. IPC는 고정 메서드만 호출. 패키지는 로컬 패키지 ID allowlist만 허용하며 쉘 없이 `winget` 인자로 실행. 보안 점검 후 서명된 정식 빌드로 배포해야 합니다.

WinGet은 설치 프로그램 다운로드 검증과 매니페스트를 관리하지만 EasyOpen이 Windows 실기기에서 패키지 버전·설치 단계·데이터 보존을 검증했다는 뜻은 **아닙니다**.

## 카탈로그 관리

`../easyopen-catalog/apps.json`만 직접 수정합니다. 앱은 시작할 때
`https://catalog.easy-open.mano.io.kr/v1/apps.json`을 조회하고 실패하거나 응답이 유효하지 않으면
`resources/catalog.json`을 사용합니다. `npm run sync:catalog`는 이 내장 fallback을 생성합니다.
원격 Catalog는 표시 정보만 갱신하며 WinGet 실행 권한은 코드 allowlist가 별도로 통제합니다.

## 유지보수 주의

- Windows에서 WinGet 사용 가능 여부 및 명령 출력을 검증하세요.
- WinGet의 지역화된 출력은 달라질 수 있어 상태 감지가 일부 실패할 수 있습니다. 확인 실패를 설치 안 됨으로 단정하지 않도록 향후 보강 필요.
- 개발 모드의 Vite 웹 UI는 보여주기용이며 실제 설치 동작은 Electron IPC에서만 가능합니다.
- 기존 사이트와 mano-admin은 변경하지 않았습니다.
