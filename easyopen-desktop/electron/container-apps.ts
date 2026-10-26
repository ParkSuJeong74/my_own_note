import type {ContainerAppSpec} from './container-installer';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

export type ContainerImages={cosyvoice?:string|null};

export function loadContainerImages(appPath:string):ContainerImages{
  const value:unknown=JSON.parse(readFileSync(join(appPath,'resources','container-images.json'),'utf8'));
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('잘못된 컨테이너 이미지 목록');
  const image=(value as Record<string,unknown>).cosyvoice;
  if(image!==null&&image!==undefined&&typeof image!=='string')throw new Error('잘못된 CosyVoice 이미지 설정');
  return {cosyvoice:image as string|null|undefined};
}

export function cosyVoiceContainerSpec(image:string|undefined):ContainerAppSpec|null{
  if(!image)return null;
  if(!/^[a-z0-9][a-z0-9._/-]*@sha256:[a-f0-9]{64}$/.test(image))throw new Error('승인된 sha256 이미지 digest가 아닙니다.');
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

export function containerAppSpec(id:string,images:ContainerImages):ContainerAppSpec|null{
  if(id!=='cosyvoice')return null;
  return cosyVoiceContainerSpec(images.cosyvoice??undefined);
}
