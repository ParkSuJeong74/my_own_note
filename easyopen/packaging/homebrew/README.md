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

## 자동 테스트 빌드

Desktop, 카탈로그, 공용 패키지 또는 Cask 도구 변경을 `master`에 푸시하면 macOS 테스트
빌드가 시작됩니다. Desktop의 현재 버전을 사용하므로 푸시할 때마다 버전을 올릴 필요가 없습니다.
GitHub Actions에서 해당 실행의 `easyopen-release-candidate-*` 아티팩트를 받으면 미서명 DMG,
체크섬, Cask 후보를 확인할 수 있습니다. 후보 Cask의 URL은 향후 공개용이며, 테스트 DMG는
Actions 아티팩트의 파일을 사용합니다. 공개 릴리스는 아래 수동 절차에서 진행합니다.

## 릴리스 준비

1. 활성 Apple Developer Program 팀에서 Developer ID Application 서명 자격과 공증 자격을 준비합니다.
2. GitHub Actions의 수동 EasyOpen 릴리스에서 기본 브랜치와 `release_scope=macos`를 선택합니다.
   `publish=false`는 미서명 테스트용 산출물만 생성합니다. `publish=true`는 서명·공증 후 새 prerelease를
   게시합니다. GitHub의 `DOPPLER_TOKEN`으로 `mano/prd`에서 아래 macOS 값만 읽습니다.
   - `MAC_CSC_LINK`: 개인 키가 포함된 Developer ID Application 인증서 P12를 Base64로 변환한 값
   - `MAC_CSC_KEY_PASSWORD`: P12 내보내기 암호
   - `APPLE_ID`: Apple 계정 이메일
   - `APPLE_APP_SPECIFIC_PASSWORD`: 공증용 앱 암호
   - `APPLE_TEAM_ID`: Apple Developer 팀 ID
   빌드가 생성한 `easyopen.rb`와 `SHA256SUMS.txt`는 릴리스에서 받을 수 있습니다.
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

5. Homebrew 7에서는 저장소 밖의 Cask 파일을 직접 설치할 수 없습니다. 같은 Mac에서
   아래처럼 로컬 검증용 tap을 추가하고 생성한 파일을 그 tap의 `Casks`에 복사합니다.

```sh
brew tap parksujeong74/easyopen-local "$PWD"
tap_dir="$(brew --repository parksujeong74/easyopen-local)"
mkdir -p "$tap_dir/Casks"
cp -n Casks/easyopen.rb "$tap_dir/Casks/easyopen.rb"
brew trust --cask parksujeong74/easyopen-local/easyopen
brew fetch --cask parksujeong74/easyopen-local/easyopen
brew install --cask parksujeong74/easyopen-local/easyopen
```

   Gatekeeper가 앱 실행을 허용하는지와 일반 제거 후 사용자 데이터가 유지되는지 확인합니다.
   검증 후 Cask를 기본 브랜치에 게시하고 위의 공개 tap 명령으로 다시 확인합니다.
6. 웹 배포 환경의 `NEXT_PUBLIC_HOMEBREW_CASK_URL`에 아래 설치 안내 URL을 설정하고 웹을 다시 빌드합니다.

```text
https://github.com/ParkSuJeong74/my_own_note/tree/master/easyopen/packaging/homebrew
```
