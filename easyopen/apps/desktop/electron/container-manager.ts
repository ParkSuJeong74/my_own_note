import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {dockerCommand} from './docker-command';

const execFileAsync=promisify(execFile);
export const MANAGED_LABEL='kr.io.mano.easyopen.managed';
export type ContainerAction='start'|'stop'|'restart'|'remove';
export type ManagedContainerSummary={id:string;name:string;image:string;status:string;state:string};

function safeContainerName(value:string):string{
  if(!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(value))throw new Error('허용되지 않은 컨테이너 이름');
  return value;
}

export function listManagedArgs():string[]{
  return ['ps','--all','--filter',`label=${MANAGED_LABEL}=true`,'--format','{{json .}}'];
}

export function inspectManagedArgs(name:string):string[]{
  return ['inspect','--format',`{{index .Config.Labels "${MANAGED_LABEL}"}}`,safeContainerName(name)];
}

export function actionArgs(action:ContainerAction,name:string):string[]{
  const safe=safeContainerName(name);
  if(action==='start')return ['start',safe];
  if(action==='stop')return ['stop','--time','15',safe];
  if(action==='restart')return ['restart','--time','15',safe];
  if(action==='remove')return ['rm','--force',safe];
  throw new Error('지원하지 않는 컨테이너 작업');
}

export function logArgs(name:string):string[]{return ['logs','--tail','200','--timestamps',safeContainerName(name)];}

export function parseManagedContainers(output:string):ManagedContainerSummary[]{
  return output.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{
    const value:unknown=JSON.parse(line);
    if(!value||typeof value!=='object')throw new Error('잘못된 Docker 목록 응답');
    const item=value as Record<string,unknown>;
    if(!['ID','Names','Image','Status','State'].every(key=>typeof item[key]==='string'))throw new Error('Docker 목록 필드가 없습니다.');
    return {id:String(item.ID),name:safeContainerName(String(item.Names)),image:String(item.Image),status:String(item.Status),state:String(item.State)};
  });
}

async function docker(args:string[],timeout=30000){
  const {stdout,stderr}=await execFileAsync(dockerCommand(),args,{timeout,windowsHide:true,maxBuffer:1024*1024});
  return `${stdout}\n${stderr}`.trim();
}

export async function listManagedContainers():Promise<ManagedContainerSummary[]>{
  return parseManagedContainers(await docker(listManagedArgs()));
}

async function requireManaged(name:string):Promise<void>{
  const result=await docker(inspectManagedArgs(name));
  if(result.trim()!=='true')throw new Error('EasyOpen이 관리하는 컨테이너가 아닙니다.');
}

export async function runManagedContainerAction(action:ContainerAction,name:string):Promise<{ok:boolean;message:string}>{
  try{await requireManaged(name);const result=await docker(actionArgs(action,name),120000);return {ok:true,message:result||`${action} 작업이 완료됐습니다.`};}
  catch(error){return {ok:false,message:error instanceof Error?error.message:'컨테이너 작업에 실패했습니다.'};}
}

export async function readManagedContainerLogs(name:string):Promise<string>{
  await requireManaged(name);
  return docker(logArgs(name));
}
