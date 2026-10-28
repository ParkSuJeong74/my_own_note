import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const execFileAsync=promisify(execFile);

export type RuntimeStatus={
  wslInstalled:boolean;
  dockerInstalled:boolean;
  dockerRunning:boolean;
  dockerVersion:string|null;
};
export type RuntimeAction='install-wsl'|'install-docker';

export function buildRuntimeArgs(action:RuntimeAction):{command:string;args:string[]}{
  if(action==='install-wsl')return {command:'wsl.exe',args:['--install','--no-distribution']};
  if(action==='install-docker')return {command:'winget',args:['install','--id','Docker.DockerDesktop','--exact','--source','winget','--accept-package-agreements','--accept-source-agreements']};
  throw new Error('지원하지 않는 Runtime 작업');
}

export async function runRuntimeAction(action:RuntimeAction,onLog?:(message:string)=>void):Promise<{ok:boolean;message:string}>{
  const {command,args}=buildRuntimeArgs(action);
  try{
    const child=execFile(command,args,{windowsHide:true},(error,stdout,stderr)=>{
      const output=`${stdout}\n${stderr}`.trim();
      if(output)onLog?.(output.slice(-4000));
      void error;
    });
    return await new Promise(resolve=>{
      child.once('error',error=>resolve({ok:false,message:error.message}));
      child.once('close',code=>resolve({ok:code===0,message:code===0?(action==='install-wsl'?'WSL 설치 명령이 완료됐습니다. 재부팅이 필요할 수 있습니다.':'Docker Desktop 설치가 완료됐습니다. 실행 후 이용약관을 확인해 주세요.'):`Runtime 설치 명령이 코드 ${code}로 종료됐습니다.`}));
    });
  }catch(error){return {ok:false,message:error instanceof Error?error.message:'Runtime 설치에 실패했습니다.'};}
}

async function probe(command:string,args:string[],timeout=10000):Promise<{ok:boolean;stdout:string}>{
  try{
    const {stdout}=await execFileAsync(command,args,{timeout,windowsHide:true});
    return {ok:true,stdout:stdout.trim()};
  }catch{return {ok:false,stdout:''};}
}

export async function detectRuntime(platform:string):Promise<RuntimeStatus>{
  if(platform!=='win32')return {wslInstalled:false,dockerInstalled:false,dockerRunning:false,dockerVersion:null};
  const [wsl,dockerClient]=await Promise.all([
    probe('wsl.exe',['--status']),
    probe('docker.exe',['--version']),
  ]);
  if(!dockerClient.ok)return {wslInstalled:wsl.ok,dockerInstalled:false,dockerRunning:false,dockerVersion:null};
  const server=await probe('docker.exe',['version','--format','{{.Server.Version}}']);
  return {wslInstalled:wsl.ok,dockerInstalled:true,dockerRunning:server.ok,dockerVersion:server.ok?server.stdout:null};
}

export type ManagedContainer={containerName:string;image:string;modelVolume:string};
export type RemovalChoice={removeImage:boolean;removeModels:boolean};

function safeName(value:string,label:string):string{
  if(!/^[a-z0-9][a-z0-9._/@:-]{0,255}$/i.test(value))throw new Error(`허용되지 않은 ${label}`);
  return value;
}

export function buildRemovalCommands(app:ManagedContainer,choice:RemovalChoice):string[][]{
  const container=safeName(app.containerName,'컨테이너 이름');
  const image=safeName(app.image,'이미지 이름');
  const volume=safeName(app.modelVolume,'볼륨 이름');
  const commands=[['rm','--force',container]];
  if(choice.removeImage)commands.push(['image','rm',image]);
  if(choice.removeModels)commands.push(['volume','rm',volume]);
  return commands;
}
