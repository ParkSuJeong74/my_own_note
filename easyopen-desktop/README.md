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

`../easyopen-catalog/apps.json`만 직접 수정합니다. `npm run sync:catalog`가 `resources/catalog.json`을 생성합니다. 웹과 모바일 앱도 동일 파일을 읽도록 유지합니다.

## 유지보수 주의

- Windows에서 WinGet 사용 가능 여부 및 명령 출력을 검증하세요.
- WinGet의 지역화된 출력은 달라질 수 있어 상태 감지가 일부 실패할 수 있습니다. 확인 실패를 설치 안 됨으로 단정하지 않도록 향후 보강 필요.
- 개발 모드의 Vite 웹 UI는 보여주기용이며 실제 설치 동작은 Electron IPC에서만 가능합니다.
- 기존 사이트와 mano-admin은 변경하지 않았습니다.
