# EasyOpen Android (Galaxy discovery MVP)

React Native + Expo 기반 Android용 초기 앱입니다. 데스크톱과 **같은 원본 카탈로그 JSON**을 사용합니다.

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

`npm audit`에는 Expo CLI가 사용하는 `node-forge`의 고위험 경고가 남아 있습니다. npm이 제안하는 `--force`는 Expo 44로 역행하므로 적용하지 않습니다. 수정된 Expo SDK 또는 상위 CLI가 제공될 때 재검증하고, 그 전에는 개발 서버와 서명 관련 입력을 신뢰할 수 없는 외부에 노출하지 않습니다.

## GitHub Releases APK

통합 GitHub Actions 워크플로는 Expo prebuild 후 서명된 release APK를 만들어 Windows EXE와
같은 공개 prerelease에 첨부합니다. 다음 GitHub Actions Secrets가 모두 필요합니다.

- `EASYOPEN_ANDROID_KEYSTORE_BASE64`
- `EASYOPEN_ANDROID_KEY_ALIAS`
- `EASYOPEN_ANDROID_KEYSTORE_PASSWORD`
- `EASYOPEN_ANDROID_KEY_PASSWORD`

키스토어 원본과 비밀번호를 저장소나 문서에 커밋하지 않습니다. 동일 패키지의 업데이트에는
같은 서명키가 계속 필요하므로 별도 암호화 백업과 접근 복구 절차를 마련해야 합니다.

## 제공/미제공

- 구현: 앱 탐색·검색·카테고리·상세 사양·한국어 가이드·공식 Play 스토어/공식 출처 열기·보관함(현재 세션 저장).
- 미구현: 다른 앱 설치 상태 조회, 자동 업데이트/삭제, 직접 APK 파일 설치, 서명 검증, 지속 저장소, 로그인·결제·구독. 이를 구현했다고 표시하지 않습니다.
- iOS 배포는 이번 범위에서 제외. Expo 설정의 iOS 항목이 존재하더라도 테스트 대상은 Android입니다.

## Android 설치 관리자 다음 단계

설치 상태 감지와 APK 직접 다운로드/설치를 제공하려면 Android PackageManager, PackageInstaller, 설치 출처별 서명 및 패키지명 검증, 승인 UI, 스토어 정책 검토가 먼저 필요합니다. Play와 Galaxy Store 정책에 따라 앱의 배포 채널을 결정해야 합니다. 현재는 공식 스토어 경로를 따릅니다.

## 공유 카탈로그

`../easyopen-catalog/apps.json`만 수정합니다. `npm run sync:catalog`는 Android 앱의 `src/catalog.generated.json`을 동기화합니다.
