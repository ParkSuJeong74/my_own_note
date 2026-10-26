export const RELEASES_API='https://api.github.com/repos/ParkSuJeong74/my_own_note/releases?per_page=20';
export const RELEASES_PAGE='https://github.com/ParkSuJeong74/my_own_note/releases';

type GithubAsset={name:string;browser_download_url:string;size:number;download_count:number};
type GithubRelease={tag_name:string;name:string;html_url:string;draft:boolean;prerelease:boolean;published_at:string;assets:GithubAsset[]};
export type EasyOpenRelease={tag:string;name:string;pageUrl:string;publishedAt:string;windows?:GithubAsset;android?:GithubAsset;checksums?:GithubAsset};

function safeGithubUrl(value:string):boolean{
 try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='github.com'&&url.pathname.startsWith('/ParkSuJeong74/my_own_note/releases/')}catch{return false}
}

export function selectEasyOpenRelease(value:unknown):EasyOpenRelease|null{
 if(!Array.isArray(value))return null;
 for(const item of value as GithubRelease[]){
  if(!item||item.draft||!item.prerelease||!/^easyopen-v[0-9]/.test(item.tag_name)||!safeGithubUrl(item.html_url)||!Array.isArray(item.assets))continue;
  const safeAssets=item.assets.filter(asset=>asset&&safeGithubUrl(asset.browser_download_url));
  const windows=safeAssets.find(asset=>/^EasyOpen-[0-9].*-Setup\.exe$/.test(asset.name));
  const android=safeAssets.find(asset=>/^EasyOpen-Android-.*\.apk$/.test(asset.name));
  const checksums=safeAssets.find(asset=>asset.name==='SHA256SUMS.txt');
  if(!windows&&!android)continue;
  return {tag:item.tag_name,name:item.name,pageUrl:item.html_url,publishedAt:item.published_at,windows,android,checksums};
 }
 return null;
}
