# Homebrew Cask 준비

서명·공증된 GitHub Release DMG의 SHA-256을 사용해 Cask를 생성합니다.

```sh
node easyopen/packaging/homebrew/render-cask.mjs 0.1.1-beta.1 <DMG_SHA256> > easyopen.rb
brew install --cask ./easyopen.rb
brew uninstall --cask easyopen
```

로컬 설치·제거 시험을 통과한 `easyopen.rb`를 사용자 소유 Homebrew tap에 등록해야 웹사이트의 Homebrew 버튼을 활성화할 수 있습니다. tap URL이 실제 공개되기 전에는 웹 환경 변수 `NEXT_PUBLIC_HOMEBREW_CASK_URL`을 설정하지 않습니다.
