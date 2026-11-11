#!/usr/bin/env node

export function renderCask(version,sha256){
  if(!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version))throw new Error('invalid EasyOpen version');
  if(!/^[a-f0-9]{64}$/.test(sha256))throw new Error('invalid DMG sha256');
  return `cask "easyopen" do
  version "${version}"
  sha256 "${sha256}"

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
`;
}

if(import.meta.url===`file://${process.argv[1]}`){
  try{process.stdout.write(renderCask(process.argv[2]??'',process.argv[3]??''));}
  catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
}
