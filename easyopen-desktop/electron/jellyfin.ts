import {access} from 'node:fs/promises';
import {join} from 'node:path';
import type {NetworkInterfaceInfo} from 'node:os';

export const JELLYFIN_LOCAL_URL='http://127.0.0.1:8096';
export const JELLYFIN_PORT=8096;

export type JellyfinMacStatus={
  supported:boolean;
  installed:boolean;
  running:boolean;
  appPath:string|null;
  url:string;
  message:string;
};

export function jellyfinMacCandidates(home:string):string[]{
  return ['/Applications/Jellyfin.app',join(home,'Applications','Jellyfin.app')];
}

export async function findJellyfinMacApp(home:string,canAccess:(path:string)=>Promise<unknown>=access):Promise<string|null>{
  for(const candidate of jellyfinMacCandidates(home)){
    try{await canAccess(candidate);return candidate;}catch{continue;}
  }
  return null;
}

export async function isJellyfinLocalServerRunning(request:typeof fetch=fetch):Promise<boolean>{
  try{
    const response=await request(`${JELLYFIN_LOCAL_URL}/System/Info/Public`,{signal:AbortSignal.timeout(2500),redirect:'error'});
    if(!response.ok)return false;
    const contentType=response.headers.get('content-type')??'';
    return contentType.toLowerCase().includes('application/json');
  }catch{return false;}
}

export async function readJellyfinMacStatus(home:string,canAccess:(path:string)=>Promise<unknown>=access,request:typeof fetch=fetch):Promise<JellyfinMacStatus>{
  const [appPath,running]=await Promise.all([findJellyfinMacApp(home,canAccess),isJellyfinLocalServerRunning(request)]);
  const installed=Boolean(appPath);
  return {
    supported:true,installed,running,appPath,url:JELLYFIN_LOCAL_URL,
    message:running?'Jellyfin 서버가 이 Mac에서 실행 중입니다.':installed?'Jellyfin은 설치되어 있지만 로컬 서버 응답이 없습니다.':'Jellyfin Server가 아직 설치되지 않았습니다.',
  };
}

export function isPrivateIpv4(address:string):boolean{
  const parts=address.split('.').map(Number);
  if(parts.length!==4||parts.some(part=>!Number.isInteger(part)||part<0||part>255))return false;
  return parts[0]===10||(parts[0]===172&&parts[1]>=16&&parts[1]<=31)||(parts[0]===192&&parts[1]===168);
}

export function selectLanIpv4(interfaces:NodeJS.Dict<NetworkInterfaceInfo[]>):string|null{
  const candidates=Object.entries(interfaces).flatMap(([name,entries])=>(entries??[]).map(entry=>({name,entry})))
    .filter(({name,entry})=>/^(en|eth)/.test(name)&&entry.family==='IPv4'&&!entry.internal&&isPrivateIpv4(entry.address));
  candidates.sort((left,right)=>{
    const rank=(name:string)=>name==='en0'?0:name==='en1'?1:/^(en|eth)/.test(name)?2:3;
    return rank(left.name)-rank(right.name)||left.name.localeCompare(right.name);
  });
  return candidates[0]?.entry.address??null;
}

export function jellyfinLanUrl(address:string|null):string|null{
  return address&&isPrivateIpv4(address)?`http://${address}:${JELLYFIN_PORT}`:null;
}
