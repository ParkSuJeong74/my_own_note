import {spawn} from 'node:child_process';
import {open} from 'node:fs/promises';
import {mkdir,rm} from 'node:fs/promises';
import {jellyfinLaunchSpec,jellyfinRuntimePaths,type JellyfinRuntimeCandidate} from './jellyfin-runtime';

export type ManagedJellyfinProcess={pid?:number|null;unref():void;once(event:'exit',listener:()=>void):unknown};
export type ManagedJellyfinSpawner=(command:string,args:string[],options:{cwd:string;detached:boolean;windowsHide:boolean;stdio:['ignore',number,number]})=>ManagedJellyfinProcess;

export async function startManagedJellyfin(
  userData:string,
  candidate:JellyfinRuntimeCandidate,
  spawner:ManagedJellyfinSpawner=(command,args,options)=>spawn(command,args,options),
  onExit:()=>void=()=>{},
):Promise<{pid:number}> {
  const paths=jellyfinRuntimePaths(userData,candidate);
  const spec=jellyfinLaunchSpec(userData,candidate);
  await Promise.all([mkdir(paths.data,{recursive:true}),mkdir(paths.cache,{recursive:true}),mkdir(paths.logs,{recursive:true})]);
  const stdout=await open(`${paths.logs}/jellyfin.stdout.log`,'a');
  const stderr=await open(`${paths.logs}/jellyfin.stderr.log`,'a');
  try{
    const child=spawner(spec.command,spec.args,{cwd:spec.cwd,detached:true,windowsHide:true,stdio:['ignore',stdout.fd,stderr.fd]});
    if(typeof child.pid!=='number'||child.pid<=0)throw new Error('Jellyfin 관리 프로세스 ID를 확인하지 못했습니다.');
    child.once('exit',onExit);
    child.unref();
    return {pid:child.pid};
  }finally{
    await Promise.all([stdout.close(),stderr.close()]);
  }
}

export async function forgetManagedJellyfinRuntime(userData:string,candidate:JellyfinRuntimeCandidate):Promise<void>{
  const paths=jellyfinRuntimePaths(userData,candidate);
  await rm(paths.versionRoot,{recursive:true,force:true});
  await rm(`${paths.root}/downloads`,{recursive:true,force:true});
}
