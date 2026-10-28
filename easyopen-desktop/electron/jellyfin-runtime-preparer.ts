import {spawn} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {access,mkdir,rename,rm} from 'node:fs/promises';
import {Readable} from 'node:stream';
import type {ReadableStream as NodeReadableStream} from 'node:stream/web';
import {pipeline} from 'node:stream/promises';
import {join} from 'node:path';
import {
  JELLYFIN_WINDOWS_X64,
  isAllowedJellyfinRedirect,
  isAllowedJellyfinRuntimeUrl,
  jellyfinRuntimePaths,
  sha256File,
  validateJellyfinArchiveEntries,
  type JellyfinRuntimeCandidate,
} from './jellyfin-runtime';

type DownloadResult={finalUrl:string};
export type JellyfinPrepareProgress={stage:'checking'|'receiving'|'verifying'|'preparing'|'complete';message:string};
export type RuntimePreparerDeps={
  download:(url:string,target:string)=>Promise<DownloadResult>;
  extract:(archive:string,target:string)=>Promise<string[]>;
  verifySignature:(executable:string)=>Promise<boolean>;
};

function run(command:string,args:string[]):Promise<{code:number|null;stdout:string;stderr:string}>{
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{windowsHide:true,shell:false});
    let stdout='';let stderr='';
    child.stdout.on('data',chunk=>{stdout=(stdout+String(chunk)).slice(-12000);});
    child.stderr.on('data',chunk=>{stderr=(stderr+String(chunk)).slice(-12000);});
    child.once('error',reject);
    child.once('close',code=>resolve({code,stdout,stderr}));
  });
}

export async function downloadRuntime(url:string,target:string):Promise<DownloadResult>{
  if(!isAllowedJellyfinRuntimeUrl(url))throw new Error('허용되지 않은 Jellyfin Runtime 주소입니다.');
  const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(10*60_000)});
  if(!response.ok||!response.body)throw new Error(`Jellyfin Runtime 응답 오류: ${response.status}`);
  if(!isAllowedJellyfinRedirect(response.url))throw new Error('Jellyfin 공식 미러가 아닌 곳으로 이동했습니다.');
  await pipeline(Readable.fromWeb(response.body as unknown as NodeReadableStream),createWriteStream(target,{flags:'wx'}));
  return {finalUrl:response.url};
}

export async function extractRuntime(archive:string,target:string):Promise<string[]>{
  if(process.platform!=='win32')throw new Error('Windows Runtime 압축 해제는 Windows에서만 지원합니다.');
  const listScript='Add-Type -AssemblyName System.IO.Compression.FileSystem;$z=[IO.Compression.ZipFile]::OpenRead($args[0]);$n=@($z.Entries|ForEach-Object {$_.FullName});$z.Dispose();$n|ConvertTo-Json -Compress';
  const listed=await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',listScript,archive]);
  if(listed.code!==0)throw new Error('Jellyfin Runtime 압축 구조를 읽지 못했습니다.');
  const parsed=JSON.parse(listed.stdout) as unknown;
  const entries=Array.isArray(parsed)?parsed:typeof parsed==='string'?[parsed]:[];
  if(!entries.every(entry=>typeof entry==='string')||!validateJellyfinArchiveEntries(entries as string[]))throw new Error('Jellyfin Runtime 압축 구조가 예상과 다릅니다.');
  const extractScript='Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force';
  const extracted=await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',extractScript,archive,target]);
  if(extracted.code!==0)throw new Error('Jellyfin Runtime 압축을 해제하지 못했습니다.');
  return entries as string[];
}

export async function verifyWindowsAuthenticode(executable:string):Promise<boolean>{
  if(process.platform!=='win32')return false;
  const script='$s=Get-AuthenticodeSignature -LiteralPath $args[0];[PSCustomObject]@{Status=$s.Status.ToString();Subject=$s.SignerCertificate.Subject}|ConvertTo-Json -Compress';
  const result=await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',script,executable]);
  if(result.code!==0)return false;
  try{
    const value=JSON.parse(result.stdout) as {Status?:unknown;Subject?:unknown};
    return value.Status==='Valid'&&typeof value.Subject==='string'&&value.Subject.length>0;
  }catch{return false;}
}

const defaultDeps:RuntimePreparerDeps={download:downloadRuntime,extract:extractRuntime,verifySignature:verifyWindowsAuthenticode};

export async function prepareWindowsJellyfinRuntime(
  userData:string,
  candidate:JellyfinRuntimeCandidate=JELLYFIN_WINDOWS_X64,
  deps:RuntimePreparerDeps=defaultDeps,
  progress:(value:JellyfinPrepareProgress)=>void=()=>{},
):Promise<{version:string;executable:string;alreadyPrepared:boolean}>{
  if(candidate.platform!=='win32'||candidate.arch!=='x64'||!isAllowedJellyfinRuntimeUrl(candidate.url))throw new Error('검토되지 않은 Jellyfin Runtime 후보입니다.');
  const paths=jellyfinRuntimePaths(userData,candidate);
  progress({stage:'checking',message:'기존 사용 준비 상태를 확인하고 있어요.'});
  try{
    await access(paths.executable);
    if(!await deps.verifySignature(paths.executable))throw new Error('기존 Jellyfin Runtime 서명을 확인할 수 없습니다.');
    progress({stage:'complete',message:'Jellyfin 사용 준비를 확인했습니다.'});
    return {version:candidate.version,executable:paths.executable,alreadyPrepared:true};
  }catch(error){
    if(error instanceof Error&&error.message.includes('서명을 확인'))throw error;
  }

  const downloads=join(paths.root,'downloads');
  const archive=join(downloads,`jellyfin-${candidate.version}.zip.partial`);
  const staging=join(paths.root,`runtime-${candidate.version}.staging`);
  await mkdir(downloads,{recursive:true});
  await rm(archive,{force:true});
  await rm(staging,{recursive:true,force:true});
  await mkdir(staging,{recursive:true});

  try{
    progress({stage:'receiving',message:'Jellyfin 공식 파일을 받고 있어요.'});
    const downloaded=await deps.download(candidate.url,archive);
    if(!isAllowedJellyfinRedirect(downloaded.finalUrl))throw new Error('공식 Jellyfin 미러에서 받은 파일이 아닙니다.');
    progress({stage:'verifying',message:'받은 파일이 검토한 공식 파일인지 확인하고 있어요.'});
    if(await sha256File(archive)!==candidate.sha256)throw new Error('Jellyfin Runtime SHA-256이 검토한 값과 다릅니다.');
    progress({stage:'preparing',message:'EasyOpen에서 사용할 공간을 준비하고 있어요.'});
    const entries=await deps.extract(archive,staging);
    if(!validateJellyfinArchiveEntries(entries))throw new Error('Jellyfin Runtime 압축 구조가 예상과 다릅니다.');
    const stagedExecutable=join(staging,candidate.archiveRoot,candidate.executable);
    await access(stagedExecutable);
    if(!await deps.verifySignature(stagedExecutable))throw new Error('Jellyfin Runtime의 Windows 서명이 유효하지 않습니다.');
    await mkdir(join(paths.root,'runtime'),{recursive:true});
    await rename(staging,paths.versionRoot);
    progress({stage:'complete',message:'Jellyfin 사용 준비를 마쳤습니다.'});
    return {version:candidate.version,executable:paths.executable,alreadyPrepared:false};
  }finally{
    await rm(archive,{force:true});
    await rm(staging,{recursive:true,force:true});
  }
}
