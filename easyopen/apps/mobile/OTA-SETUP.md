# EasyOpen 화면 업데이트 설정

코드는 준비되어 있지만 Expo 프로젝트를 연결하기 전에는 OTA가 비활성입니다.
기존 설치본은 이 기능을 포함한 새 네이티브 빌드를 한 번 설치해야 합니다.
GitHub APK/Play Android와 직접 설치 iOS 모두 호환 runtime에만 화면 업데이트를 받습니다.
iOS 설치 서명/유효기간 제한은 OTA로 해결되지 않습니다.

## 사용자가 한 번 설정할 항목

1. expo.dev에 로그인하고 EasyOpen 프로젝트를 생성합니다. 무료 플랜의 현재 이용 한도는 계정에서 확인합니다.
2. 프로젝트 Settings에서 Project ID(UUID)를 복사합니다.
3. GitHub my_own_note → Settings → Secrets and variables → Actions → Variables → New repository variable:
   이름 EASYOPEN_EAS_PROJECT_ID, 값 Project ID를 입력합니다. 비밀키가 아닙니다.
4. Mac에서 저장소 easyopen/apps/mobile로 이동합니다. 터미널에서 아래 명령을 실행합니다.
   ```sh
   export EASYOPEN_EAS_PROJECT_ID="복사한 UUID"
   npx --yes eas-cli@27.11.0 login
   npx --yes eas-cli@27.11.0 channel:create production --branch production
   ```
   채널이 이미 있다면 재생성하지 말고 channel:view production으로 branch 연결을 확인합니다.
5. Expo 계정 Settings → Access tokens에서 본인 CI용 토큰을 생성합니다.
   GitHub 같은 Actions 설정의 Secrets → New repository secret에 이름 EXPO_TOKEN으로 저장합니다.
   토큰을 코드·채팅·Variables에 넣지 않습니다.
6. 설정 후 Android/iOS 빌드 워크플로를 실행합니다. 새 빌드를 기기에 설치합니다.
7. JS/화면 변경을 올린 후 Actions → EasyOpen mobile screen update → Run workflow를 실행합니다.
   이 워크플로는 자동 push 게시를 하지 않습니다. 승인한 변경만 게시합니다.
8. 앱을 실행하면 확인하고, 새 업데이트가 있으면 다운로드 버튼이 표시됩니다.
   다운로드 → 재시작해 적용을 선택합니다. 설정에서도 확인할 수 있습니다.

## 확인과 복구

- Expo Go/웹/개발 모드에서 실제 OTA 설치를 검증하지 않습니다. release 앱 두 버전으로 Android/iOS 각각 확인합니다.
- 네트워크 단절 시 기존 화면이 열리고, 앱 설정에서 다시 확인할 수 있어야 합니다.
- 프로젝트 UUID가 같은 상태로 빌드·OTA 게시해야 합니다. fingerprint가 다른 네이티브 변경은 새 설치 파일을 배포합니다.
- 카메라/권한/네이티브 라이브러리·설정 변경은 OTA만으로 배포할 수 없습니다.
- 잘못된 업데이트는 Expo에서 마지막 정상 업데이트를 다시 게시한 후 기기에서 수신을 확인합니다.
- CI 게시를 중단하려면 EXPO_TOKEN을 폐기합니다. UUID 변수 삭제는 이후 빌드부터 OTA를 끄며 이미 설치된 앱을 즉시 비활성화하지 않습니다.
- 데스크톱은 기존 Electron 업데이트를 사용합니다. 미서명 빌드는 공식 다운로드 안내로 이동하며 자동 설치를 보장하지 않습니다.
