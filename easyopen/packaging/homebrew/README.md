# EasyOpen Homebrew Cask

이 tap은 EasyOpen 코드와 DMG가 있는 `ParkSuJeong74/my_own_note` 저장소를 사용합니다.
Cask는 기본 브랜치 최상위의 `Casks/easyopen.rb`에 게시합니다.

## 설치

Cask 공개 후 Apple Silicon Mac에서 실행합니다.

```sh
brew tap parksujeong74/easyopen https://github.com/ParkSuJeong74/my_own_note.git
brew install --cask parksujeong74/easyopen/easyopen
open -a EasyOpen
```

새 버전 설치는 `brew update` 후 `brew upgrade --cask parksujeong74/easyopen/easyopen`으로 합니다.
앱 제거는 `brew uninstall --cask parksujeong74/easyopen/easyopen`으로 합니다.

## 릴리스 준비

1. 활성 Apple Developer Program 팀에서 Developer ID Application 서명 자격과 공증 자격을 준비합니다.
2. 현재 저장소의 릴리스 워크플로는 `release_scope=all`, `publish=true`에서 macOS에 서명하고 공증합니다.
   이 경로는 Windows와 Android 서명 값도 필요합니다. macOS만 준비하는 경우 Mac에서 Xcode와
   서명 인증서를 설정한 뒤 `easyopen/apps/desktop`의 `npm run package:mac`으로 빌드할 수 있습니다.
   공증에 쓰는 `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`는 로컬 보안 설정에서 제공합니다.
   자격 증명은 저장소에 저장하지 않습니다.
3. 서명·공증 검증을 통과한 DMG를 사용합니다. 현재 공개된 미서명 beta.1 파일과 동일한 버전 URL을
   재사용하지 않습니다. 새 GitHub 릴리스의 파일 이름과 태그는 아래 생성기가 기대하는 형식을 따릅니다.
4. 배포할 DMG에서 직접 체크섬을 구하고 Cask를 생성합니다. 이 명령은 저장소 루트에서 실행합니다.

```sh
version=0.1.1-beta.2  # 실제 서명·공증된 릴리스 버전으로 바꿉니다.
dmg="/path/to/EasyOpen-${version}-arm64.dmg"
sha=$(shasum -a 256 "$dmg" | awk '{print $1}')
mkdir -p Casks
node easyopen/packaging/homebrew/render-cask.mjs "$version" "$sha" > Casks/easyopen.rb
ruby -c Casks/easyopen.rb
```

5. GitHub 릴리스에 올라간 파일로 `brew install --cask ./Casks/easyopen.rb`를 실행합니다.
   Gatekeeper가 앱 실행을 허용하는지와 일반 제거 후 사용자 데이터가 유지되는지 확인합니다.
   검증 후 Cask를 기본 브랜치에 게시하고 위의 tap 명령으로 다시 확인합니다.
6. 웹 배포 환경의 `NEXT_PUBLIC_HOMEBREW_CASK_URL`에 아래 설치 안내 URL을 설정하고 웹을 다시 빌드합니다.

```text
https://github.com/ParkSuJeong74/my_own_note/tree/master/easyopen/packaging/homebrew
```
