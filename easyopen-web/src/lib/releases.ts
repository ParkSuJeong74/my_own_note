export const RELEASES_API='https://api.github.com/repos/ParkSuJeong74/my_own_note/releases?per_page=20';
export const RELEASES_PAGE='https://github.com/ParkSuJeong74/my_own_note/releases';

export type GithubAsset={name:string;browser_download_url:string;size:number;download_count:number};
type GithubRelease={tag_name:string;name:string;html_url:string;draft:boolean;prerelease:boolean;published_at:string;assets:GithubAsset[]};
export type EasyOpenRelease={tag:string;name:string;pageUrl:string;publishedAt:string;windows?:GithubAsset;macos?:GithubAsset;android?:GithubAsset;checksums?:GithubAsset};

function safeGithubUrl(value:string):boolean{
 try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='github.com'&&url.pathname.startsWith('/ParkSuJeong74/my_own_note/releases/')}catch{return false}
}

function parseRelease(item:GithubRelease):EasyOpenRelease|null{
 if(!item||item.draft||!item.prerelease||!/^easyopen-v[0-9]/.test(item.tag_name)||!safeGithubUrl(item.html_url)||!Array.isArray(item.assets))return null;
 const safeAssets=item.assets.filter(asset=>asset&&typeof asset.name==='string'&&typeof asset.size==='number'&&Number.isFinite(asset.size)&&typeof asset.download_count==='number'&&Number.isFinite(asset.download_count)&&asset.download_count>=0&&safeGithubUrl(asset.browser_download_url));
 const windows=safeAssets.find(asset=>/^EasyOpen-[0-9].*-Setup\.exe$/.test(asset.name));
 const macos=safeAssets.find(asset=>/^EasyOpen-[0-9].*-(arm64|x64)\.dmg$/.test(asset.name));
 const android=safeAssets.find(asset=>/^EasyOpen-Android-.*\.apk$/.test(asset.name));
 const checksums=safeAssets.find(asset=>asset.name==='SHA256SUMS.txt');
 if(!windows&&!macos&&!android)return null;
 return {tag:item.tag_name,name:item.name,pageUrl:item.html_url,publishedAt:item.published_at,windows,macos,android,checksums};
}

export function selectEasyOpenReleases(value:unknown):EasyOpenRelease[]{
 if(!Array.isArray(value))return [];
 return (value as GithubRelease[]).map(parseRelease).filter((release):release is EasyOpenRelease=>release!==null);
}

export function selectEasyOpenRelease(value:unknown):EasyOpenRelease|null{
 return selectEasyOpenReleases(value)[0]??null;
}

export function summarizeDownloads(releases:EasyOpenRelease[]){
 const windows=releases.reduce((sum,release)=>sum+(release.windows?.download_count??0),0);
 const android=releases.reduce((sum,release)=>sum+(release.android?.download_count??0),0);
 return {windows,android,total:windows+android,releaseCount:releases.length};
}
