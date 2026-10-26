import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const execFileAsync=promisify(execFile);
const MANAGED_LABEL='kr.io.mano.easyopen.managed';
const APP_LABEL='kr.io.mano.easyopen.app-id';

export type ContainerAppSpec={
  id:string;
  containerName:string;
  image:string;
  ports:{host:number;container:number}[];
  volumes:{name:string;mount:string}[];
  gpu:boolean;
  healthUrl:string;
};
export type InstallProgress={stage:'pull'|'create'|'start'|'health'|'complete';percent:number;message:string};
export type DockerRunner=(args:string[],timeoutMs?:number,signal?:AbortSignal)=>Promise<string>;

function safeId(value:string,label:string,pattern:RegExp){if(!pattern.test(value))throw new Error(`허용되지 않은 ${label}`);return value;}
function safePort(value:number,host:boolean){if(!Number.isInteger(value)||value<(host?1024:1)||value>65535)throw new Error('허용되지 않은 포트');return value;}

export function validateContainerSpec(spec:ContainerAppSpec):ContainerAppSpec{
  safeId(spec.id,'앱 ID',/^[a-z0-9][a-z0-9-]{0,63}$/);
  safeId(spec.containerName,'컨테이너 이름',/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/);
  safeId(spec.image,'이미지 digest',/^[a-z0-9][a-z0-9._/-]*@sha256:[a-f0-9]{64}$/);
  if(!spec.ports.length)throw new Error('포트가 없습니다.');
  for(const port of spec.ports){safePort(port.host,true);safePort(port.container,false);}
  for(const volume of spec.volumes){safeId(volume.name,'볼륨 이름',/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/);if(!/^\/[a-zA-Z0-9._/-]+$/.test(volume.mount)||volume.mount.includes('..'))throw new Error('허용되지 않은 컨테이너 경로');}
  const health=new URL(spec.healthUrl);
  if(health.protocol!=='http:'||health.hostname!=='127.0.0.1'||!spec.ports.some(port=>String(port.host)===health.port))throw new Error('health check는 승인된 loopback 포트만 사용할 수 있습니다.');
  return spec;
}

export function pullArgs(spec:ContainerAppSpec):string[]{validateContainerSpec(spec);return ['pull',spec.image];}
export function createArgs(spec:ContainerAppSpec):string[]{
  validateContainerSpec(spec);
  const args=['create','--name',spec.containerName,'--label',`${MANAGED_LABEL}=true`,'--label',`${APP_LABEL}=${spec.id}`,'--restart','unless-stopped'];
  if(spec.gpu)args.push('--gpus','all');
  for(const port of spec.ports)args.push('--publish',`127.0.0.1:${port.host}:${port.container}`);
  for(const volume of spec.volumes)args.push('--volume',`${volume.name}:${volume.mount}`);
  args.push(spec.image);
  return args;
}

async function defaultRunner(args:string[],timeoutMs=10*60*1000,signal?:AbortSignal){
  const {stdout,stderr}=await execFileAsync('docker.exe',args,{timeout:timeoutMs,windowsHide:true,maxBuffer:4*1024*1024,signal});
  return `${stdout}\n${stderr}`.trim();
}

function ensureActive(signal?:AbortSignal){if(signal?.aborted)throw new Error('사용자가 설치를 취소했습니다.');}

export async function waitForHealth(url:string,attempts=30,delayMs=2000,fetcher:typeof fetch=fetch,signal?:AbortSignal):Promise<boolean>{
  const target=new URL(url);
  if(target.protocol!=='http:'||target.hostname!=='127.0.0.1')throw new Error('외부 health check는 허용되지 않습니다.');
  for(let attempt=0;attempt<attempts;attempt++){
    ensureActive(signal);
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),3000);
    const cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});
    try{const response=await fetcher(target,{signal:controller.signal});if(response.ok)return true;}catch{/* retry */}finally{clearTimeout(timer);}
    signal?.removeEventListener('abort',cancel);ensureActive(signal);
    if(attempt<attempts-1)await new Promise<void>((resolve,reject)=>{const cancel=()=>{clearTimeout(timer);reject(new Error('사용자가 설치를 취소했습니다.'));};const timer=setTimeout(()=>{signal?.removeEventListener('abort',cancel);resolve();},delayMs);signal?.addEventListener('abort',cancel,{once:true});});
  }
  return false;
}

export async function installContainerApp(spec:ContainerAppSpec,runner:DockerRunner=defaultRunner,health:(url:string,signal?:AbortSignal)=>Promise<boolean>=(url,signal)=>waitForHealth(url,30,2000,fetch,signal),log:(message:string)=>void=()=>{},signal?:AbortSignal,progress:(value:InstallProgress)=>void=()=>{}){
  validateContainerSpec(spec);
  let created=false;
  try{
    ensureActive(signal);progress({stage:'pull',percent:10,message:'검증된 컨테이너 이미지를 내려받고 있습니다.'});log('검증된 컨테이너 이미지를 내려받고 있습니다.');
    await runner(pullArgs(spec),10*60*1000,signal);
    ensureActive(signal);progress({stage:'create',percent:55,message:'전용 컨테이너와 모델 저장 공간을 준비하고 있습니다.'});log('EasyOpen 전용 컨테이너와 모델 저장 공간을 준비하고 있습니다.');
    created=true;await runner(createArgs(spec),10*60*1000,signal);
    ensureActive(signal);progress({stage:'start',percent:70,message:'CosyVoice 컨테이너를 시작하고 있습니다.'});
    await runner(['start',spec.containerName],120000,signal);
    ensureActive(signal);progress({stage:'health',percent:85,message:'모델 준비와 로컬 Web UI 연결을 확인하고 있습니다.'});log('CosyVoice가 준비될 때까지 로컬 연결을 확인하고 있습니다. 첫 실행은 모델 다운로드로 오래 걸릴 수 있습니다.');
    if(!await health(spec.healthUrl,signal))throw new Error('컨테이너가 시작됐지만 health check에 실패했습니다.');
    ensureActive(signal);progress({stage:'complete',percent:100,message:'CosyVoice 설치와 준비를 완료했습니다.'});
    log('로컬 Web UI 준비를 확인했습니다.');
    return {ok:true,message:'컨테이너 앱 설치와 health check가 완료됐습니다.'};
  }catch(error){
    if(created){try{await runner(['rm','--force',spec.containerName],120000);}catch{/* volumes are intentionally preserved */}}
    return {ok:false,message:signal?.aborted?'사용자가 설치를 취소했습니다.':error instanceof Error?error.message:'컨테이너 앱 설치에 실패했습니다.'};
  }
}
