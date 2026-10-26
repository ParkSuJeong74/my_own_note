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
export type DockerRunner=(args:string[],timeoutMs?:number)=>Promise<string>;

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

async function defaultRunner(args:string[],timeoutMs=10*60*1000){
  const {stdout,stderr}=await execFileAsync('docker.exe',args,{timeout:timeoutMs,windowsHide:true,maxBuffer:4*1024*1024});
  return `${stdout}\n${stderr}`.trim();
}

export async function waitForHealth(url:string,attempts=30,delayMs=2000,fetcher:typeof fetch=fetch):Promise<boolean>{
  const target=new URL(url);
  if(target.protocol!=='http:'||target.hostname!=='127.0.0.1')throw new Error('외부 health check는 허용되지 않습니다.');
  for(let attempt=0;attempt<attempts;attempt++){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),3000);
    try{const response=await fetcher(target,{signal:controller.signal});if(response.ok)return true;}catch{/* retry */}finally{clearTimeout(timer);}
    if(attempt<attempts-1)await new Promise(resolve=>setTimeout(resolve,delayMs));
  }
  return false;
}

export async function installContainerApp(spec:ContainerAppSpec,runner:DockerRunner=defaultRunner,health:(url:string)=>Promise<boolean>=url=>waitForHealth(url),log:(message:string)=>void=()=>{}){
  validateContainerSpec(spec);
  let created=false;
  try{
    log('검증된 컨테이너 이미지를 내려받고 있습니다.');
    await runner(pullArgs(spec));
    log('EasyOpen 전용 컨테이너와 모델 저장 공간을 준비하고 있습니다.');
    await runner(createArgs(spec));created=true;
    await runner(['start',spec.containerName],120000);
    log('CosyVoice가 준비될 때까지 로컬 연결을 확인하고 있습니다. 첫 실행은 모델 다운로드로 오래 걸릴 수 있습니다.');
    if(!await health(spec.healthUrl))throw new Error('컨테이너가 시작됐지만 health check에 실패했습니다.');
    log('로컬 Web UI 준비를 확인했습니다.');
    return {ok:true,message:'컨테이너 앱 설치와 health check가 완료됐습니다.'};
  }catch(error){
    if(created){try{await runner(['rm','--force',spec.containerName],120000);}catch{/* volumes are intentionally preserved */}}
    return {ok:false,message:error instanceof Error?error.message:'컨테이너 앱 설치에 실패했습니다.'};
  }
}
