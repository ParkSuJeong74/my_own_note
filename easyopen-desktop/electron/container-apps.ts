import type {ContainerAppSpec} from './container-installer';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

export type ContainerImages={cosyvoice?:string|null};
export type ContainerImageSource='remote'|'cache'|'bundled';
export type ResolvedContainerImages={images:ContainerImages;source:ContainerImageSource};
export const CONTAINER_IMAGES_URL='https://raw.githubusercontent.com/ParkSuJeong74/my_own_note/master/easyopen-catalog/container-images.json';
const COSYVOICE_IMAGE=/^ghcr\.io\/parksujeong74\/easyopen-cosyvoice@sha256:[a-f0-9]{64}$/;

export function parseContainerImages(text:string):ContainerImages{
  const value:unknown=JSON.parse(text);
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('잘못된 컨테이너 이미지 목록');
  const record=value as Record<string,unknown>;
  if(Object.keys(record).some(key=>key!=='cosyvoice'))throw new Error('허용되지 않은 컨테이너 이미지 필드');
  if(record.cosyvoice!==null&&record.cosyvoice!==undefined&&(typeof record.cosyvoice!=='string'||!COSYVOICE_IMAGE.test(record.cosyvoice)))throw new Error('승인된 CosyVoice GHCR digest 형식이 아닙니다.');
  return {cosyvoice:record.cosyvoice as string|null|undefined};
}

export function loadContainerImages(appPath:string):ContainerImages{
  return parseContainerImages(readFileSync(join(appPath,'resources','container-images.json'),'utf8'));
}

export function loadCachedContainerImages(cachePath:string):ContainerImages|null{
  try{return parseContainerImages(readFileSync(cachePath,'utf8'));}catch{return null;}
}

export function saveCachedContainerImages(cachePath:string,images:ContainerImages):void{
  const verified=parseContainerImages(JSON.stringify(images));
  writeFileSync(cachePath,`${JSON.stringify(verified,null,2)}\n`,{encoding:'utf8',flag:'w'});
}

export async function fetchContainerImages(fetcher:typeof fetch=fetch,timeoutMs=8000):Promise<ContainerImages>{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetcher(CONTAINER_IMAGES_URL,{signal:controller.signal,cache:'no-store'});
    if(!response.ok)throw new Error(`컨테이너 이미지 목록 HTTP ${response.status}`);
    return parseContainerImages(await response.text());
  }finally{clearTimeout(timer);}
}

export async function resolveContainerImages(input:{bundled:ContainerImages;cached:ContainerImages|null;fetcher?:typeof fetch}):Promise<ResolvedContainerImages>{
  try{return {images:await fetchContainerImages(input.fetcher),source:'remote'};}
  catch{return input.cached?{images:input.cached,source:'cache'}:{images:input.bundled,source:'bundled'};}
}

export function cosyVoiceContainerSpec(image:string|undefined):ContainerAppSpec|null{
  if(!image)return null;
  if(!COSYVOICE_IMAGE.test(image))throw new Error('승인된 sha256 이미지 digest가 아닙니다.');
  return {
    id:'cosyvoice',
    containerName:'easyopen-cosyvoice',
    image,
    ports:[{host:50000,container:50000}],
    volumes:[{name:'easyopen-cosyvoice-models',mount:'/models'}],
    gpu:true,
    healthUrl:'http://127.0.0.1:50000/',
  };
}

export function needsContainerUpdate(installedImage:string|undefined,availableImage:string|undefined):boolean{
  return Boolean(installedImage&&availableImage&&installedImage!==availableImage);
}

export function containerAppSpec(id:string,images:ContainerImages):ContainerAppSpec|null{
  if(id!=='cosyvoice')return null;
  return cosyVoiceContainerSpec(images.cosyvoice??undefined);
}
