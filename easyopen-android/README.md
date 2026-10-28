# EasyOpen Android (Galaxy discovery MVP)

React Native + Expo 기반 Android용 초기 앱입니다. 데스크톱과 **같은 원본 카탈로그 JSON**을 사용합니다.
현재 Expo SDK 58과 React Native 0.88을 사용하며, 스토어의 Expo Go SDK 58에서 실행합니다.

## 로컬 실행

```bash
cd workspace/my_own_note/easyopen-android
npm install
npm run sync:catalog
npm test
npm run typecheck
npm run build
npm start
```

Android 기기의 Expo Go로 QR 코드를 스캔해 확인할 수 있습니다. 네이티브 자체 설치 관리자 기능을 추가할 때는 Expo 개발 빌드/네이티브 모듈 또는 bare workflow가 필요합니다.

`npm audit`에는 Expo CLI 경유 `deepmerge`와 `zod` 고위험 경고 3건이 남아 있습니다. 호환 범위의 일반 수정으로 `node-forge` 경고는 해소했습니다. npm이 제안하는
`--force`는 Expo 44로 역행하므로 적용하지 않습니다. 수정된 Expo SDK 또는 상위 CLI가 제공될
때 재검증하고, 그 전에는 개발 서버와 서명 관련 입력을 신뢰할 수 없는 외부에 노출하지 않습니다.

## GitHub Releases APK

통합 GitHub Actions 워크플로는 Expo prebuild 후 Android APK와 Windows EXE를 만듭니다.
기본 `publish=false`는 Android debug key로 서명한 개인 실기기용 APK와 Desktop 후보 및 `SHA256SUMS.txt`를 Actions 검증 아티팩트로만 남기며 태그나
GitHub Release를 만들지 않습니다. `master`에서 `publish=true`를 명시한 경우에만 같은 파일을
공개 prerelease에 첨부하고 태그를 만들며, 이때만 다음 GitHub Actions Secrets가 모두 필요합니다.

- `EASYOPEN_ANDROID_KEYSTORE_BASE64`
- `EASYOPEN_ANDROID_KEY_ALIAS`
- `EASYOPEN_ANDROID_KEYSTORE_PASSWORD`
- `EASYOPEN_ANDROID_KEY_PASSWORD`

키스토어 원본과 비밀번호를 저장소나 문서에 커밋하지 않습니다. 동일 패키지의 업데이트에는
같은 서명키가 계속 필요하므로 별도 암호화 백업과 접근 복구 절차를 마련해야 합니다.
debug APK는 첫 연결·재생 검증에만 사용하며 공개 배포나 release APK의 업데이트 시험에 사용하지 않습니다.

## Jellyfin LAN 서버 연결 베타

- 같은 Wi-Fi의 사설 IPv4 또는 `.local` 호스트를 수동 등록하고 여러 Windows·Mac 서버를 구분합니다.
- 기본 서버 선택, 온라인 상태 확인, 연결 정보의 기기 저장을 제공합니다.
- 등록 삭제는 모바일 연결 정보만 삭제하며 PC의 Jellyfin·라이브러리·미디어를 변경하지 않습니다.
- 온라인 상태를 다시 확인한 서버는 EasyOpen 내부 Jellyfin Web UI에서 로그인·탐색·재생할 수 있습니다. 최상위 화면 이동은 등록한 서버의 같은 origin으로 제한합니다.
- 자동 탐색과 Desktop 승인 코드/QR은 아직 미구현이며 내부 영상 재생은 Android 실기기 검증 전입니다.

## 제공/미제공

- 구현: 앱 탐색·검색·카테고리·상세 사양·한국어 가이드·공식 Play 스토어/공식 출처 열기·보관함(현재 세션 저장).
- 미구현: 다른 앱 설치 상태 조회, 자동 업데이트/삭제, 직접 APK 파일 설치, 서명 검증, 로그인·결제·구독. 이를 구현했다고 표시하지 않습니다.
- iOS 배포는 이번 범위에서 제외. Expo 설정의 iOS 항목이 존재하더라도 테스트 대상은 Android입니다.

## Android 설치 관리자 다음 단계

설치 상태 감지와 APK 직접 다운로드/설치를 제공하려면 Android PackageManager, PackageInstaller, 설치 출처별 서명 및 패키지명 검증, 승인 UI, 스토어 정책 검토가 먼저 필요합니다. Play와 Galaxy Store 정책에 따라 앱의 배포 채널을 결정해야 합니다. 현재는 공식 스토어 경로를 따릅니다.

## 공유 카탈로그

`../easyopen-catalog/apps.json`만 수정합니다. 앱은 시작할 때
`https://catalog.easy-open.mano.io.kr/v1/apps.json`을 조회하고 실패하거나 응답이 유효하지 않으면
`src/catalog.generated.json`을 사용합니다. `npm run sync:catalog`는 이 내장 fallback을 생성합니다.
