cask "easyopen" do
  version "0.1.1-beta.1"
  sha256 "c86fa8318c6f9dba71bff6de78bd306cb377be48431be6afa9e03f0356e95504"

  url "https://github.com/ParkSuJeong74/my_own_note/releases/download/easyopen-v#{version}/EasyOpen-#{version}-arm64.dmg"
  name "EasyOpen"
  desc "Use supported open-source programs through one desktop workspace"
  homepage "https://easy-open.mano.io.kr/"

  depends_on arch: :arm64
  app "EasyOpen.app"

  zap trash: [
    "~/Library/Application Support/EasyOpen",
    "~/Library/Preferences/kr.io.mano.easyopen.plist",
  ]
end
