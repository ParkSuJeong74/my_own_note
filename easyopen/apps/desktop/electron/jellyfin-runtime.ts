import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {join,resolve,sep} from 'node:path';

export type JellyfinRuntimeCandidate={
  platform:'win32';
  arch:'x64';
  version:string;
  url:string;
  sha256:string;
  archiveRoot:string;
  executable:string;
};

/** Historical candidate retained for verification tests; GitHub-only policy prevents selection. */
export const JELLYFIN_WINDOWS_X64:JellyfinRuntimeCandidate={
  platform:'win32',
  arch:'x64',
  version:'12.4',
  url:'https://repo.jellyfin.org/files/server/windows/stable/v12.4/amd64/jellyfin_12.4-amd64.zip',
  sha256:'d62b5b30390213680fd1fae5484082ae27b2a778cfd40a473ad7b1e4147d75a6',
  archiveRoot:'jellyfin',
  executable:'jellyfin.exe',
};

export const JELLYFIN_MACOS_BLOCKED={
  platform:'darwin' as const,
  reviewedAt:'2026-10-28',
  reason:'공식 DMG 12.4와 GitHub 10.9.9의 Jellyfin.app이 현재 macOS codesign 엄격 검증을 통과하지 못했습니다.',
  candidates:[
    {version:'12.4',arch:'arm64',sha256:'504c0e201e4d9374403300622317b9a6b8b86f860a2a52eea5734f9abf70769d'},
    {version:'10.9.9',arch:'arm64',sha256:'6ea88e4c86be2fe133882562c208b3b2df04adca82c18d9d42a4b160db2f4d97'},
  ],
};

export function selectJellyfinRuntime(platform:NodeJS.Platform,arch:string):JellyfinRuntimeCandidate|null{
  void platform;void arch;
  return null;
}

export function isAllowedJellyfinRuntimeUrl(value:string):boolean{
  try{
    const url=new URL(value);
    return url.protocol==='https:'&&!url.username&&!url.password&&url.hostname==='repo.jellyfin.org'&&
      url.pathname===`/files/server/windows/stable/v${JELLYFIN_WINDOWS_X64.version}/amd64/jellyfin_${JELLYFIN_WINDOWS_X64.version}-amd64.zip`&&
      !url.search&&!url.hash;
  }catch{return false;}
}

export function isAllowedJellyfinRedirect(value:string):boolean{
  try{
    const url=new URL(value);
    return url.protocol==='https:'&&!url.username&&!url.password&&
      (url.hostname==='repo.jellyfin.org'||url.hostname.endsWith('.mirror.jellyfin.org'));
  }catch{return false;}
}

export function validateJellyfinArchiveEntries(entries:string[]):boolean{
  const normalized=entries.map(entry=>entry.replaceAll('\\','/'));
  if(normalized.length===0||normalized.some(entry=>entry.startsWith('/')||entry.split('/').includes('..')))return false;
  const required=[
    'jellyfin/jellyfin.exe',
    'jellyfin/ffmpeg.exe',
    'jellyfin/ffprobe.exe',
    'jellyfin/jellyfin-web/index.html',
  ];
  return required.every(path=>normalized.includes(path));
}

export async function sha256File(path:string):Promise<string>{
  const hash=createHash('sha256');
  for await(const chunk of createReadStream(path))hash.update(chunk);
  return hash.digest('hex');
}

export function jellyfinRuntimePaths(userData:string,candidate=JELLYFIN_WINDOWS_X64){
  const root=join(userData,'managed','jellyfin');
  const versionRoot=join(root,'runtime',candidate.version);
  return {
    root,
    versionRoot,
    executable:join(versionRoot,candidate.archiveRoot,candidate.executable),
    data:join(root,'data'),
    cache:join(root,'cache'),
    logs:join(root,'logs'),
  };
}

export function assertManagedPath(root:string,target:string):void{
  const normalizedRoot=resolve(root)+sep;
  if(!resolve(target).startsWith(normalizedRoot))throw new Error('관리 폴더 밖의 경로는 사용할 수 없습니다.');
}

export function jellyfinLaunchSpec(userData:string,candidate=JELLYFIN_WINDOWS_X64){
  const paths=jellyfinRuntimePaths(userData,candidate);
  assertManagedPath(paths.root,paths.executable);
  assertManagedPath(paths.root,paths.data);
  return {command:paths.executable,args:['-d',paths.data,'-noautorunwebapp'],cwd:join(paths.versionRoot,candidate.archiveRoot)};
}
