import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import type {RuntimeStatus} from './runtime';

const execFileAsync=promisify(execFile);

export const COSYVOICE_CANDIDATE={
  repository:'https://github.com/QwenAudio/CosyVoice',
  commit:'074ca6dc9e80a2f424f1f74b48bdd7d3fea531cc',
  model:'FunAudioLLM/Fun-CosyVoice3-0.5B-2512',
  modelRevision:'29e01c4e8d000f4bcd70751be16fa94bf3d85a18',
  python:'3.10',
  webPort:50000,
} as const;

export type CosyVoiceGpu={name:string;memoryMb:number;driverVersion:string};
export type CosyVoiceReadiness={
  supported:boolean;
  platform:string;
  memoryGb:number;
  freeDiskGb:number|null;
  gpu:CosyVoiceGpu|null;
  runtime:RuntimeStatus;
  checks:{id:'windows'|'memory'|'disk'|'nvidia'|'wsl'|'docker';ok:boolean;label:string;detail:string}[];
  candidate:typeof COSYVOICE_CANDIDATE;
};

export function parseNvidiaSmi(value:string):CosyVoiceGpu|null{
  const line=value.split(/\r?\n/).map(v=>v.trim()).find(Boolean);
  if(!line)return null;
  const parts=line.split(',').map(v=>v.trim());
  const memoryMb=Number(parts[1]);
  if(parts.length!==3||!parts[0]||!Number.isFinite(memoryMb)||memoryMb<=0||!parts[2])return null;
  return {name:parts[0],memoryMb,driverVersion:parts[2]};
}

export function evaluateCosyVoiceReadiness(input:{platform:string;memoryGb:number;freeDiskGb:number|null;gpu:CosyVoiceGpu|null;runtime:RuntimeStatus}):CosyVoiceReadiness{
  const checks:CosyVoiceReadiness['checks']=[
    {id:'windows',ok:input.platform==='win32',label:'Windows 11',detail:input.platform==='win32'?'Windows 환경 감지':'현재 1차 지원 대상은 Windows 11입니다.'},
    {id:'memory',ok:input.memoryGb>=16,label:'메모리 16GB 이상',detail:`감지된 메모리 ${input.memoryGb}GB`},
    {id:'disk',ok:input.freeDiskGb!==null&&input.freeDiskGb>=20,label:'여유 공간 20GB 이상',detail:input.freeDiskGb===null?'저장 공간을 확인하지 못했습니다.':`여유 공간 ${input.freeDiskGb}GB`},
    {id:'nvidia',ok:Boolean(input.gpu),label:'NVIDIA GPU',detail:input.gpu?`${input.gpu.name} · VRAM ${Math.round(input.gpu.memoryMb/1024)}GB · 드라이버 ${input.gpu.driverVersion}`:'NVIDIA GPU 또는 nvidia-smi를 확인하지 못했습니다.'},
    {id:'wsl',ok:input.runtime.wslInstalled,label:'WSL2',detail:input.runtime.wslInstalled?'WSL을 확인했습니다. 버전·재부팅 상태는 설치 전에 다시 검사합니다.':'WSL 설치가 필요합니다.'},
    {id:'docker',ok:input.runtime.dockerRunning,label:'EasyOpen Runtime',detail:input.runtime.dockerRunning?`Docker Engine ${input.runtime.dockerVersion??''} 실행 중`:input.runtime.dockerInstalled?'Docker Desktop을 시작해야 합니다.':'Docker Desktop 설치와 이용약관 동의가 필요합니다.'},
  ];
  return {...input,supported:checks.every(check=>check.ok),checks,candidate:COSYVOICE_CANDIDATE};
}

export async function detectNvidiaGpu():Promise<CosyVoiceGpu|null>{
  try{
    const {stdout}=await execFileAsync('nvidia-smi',['--query-gpu=name,memory.total,driver_version','--format=csv,noheader,nounits'],{timeout:10000,windowsHide:true});
    return parseNvidiaSmi(stdout);
  }catch{return null;}
}
