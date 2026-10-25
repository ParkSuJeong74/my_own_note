import {spawn} from 'node:child_process';
export type WinGetAction='install'|'update'|'remove';
export type CommandResult={ok:boolean;code:number|null;message:string};
const MAX_LOG=8000;
export function buildArgs(action:WinGetAction,packageId:string):string[]{
  if(!/^[a-zA-Z0-9._-]+$/.test(packageId))throw new Error('허용되지 않은 패키지 ID');
  const common=['--id',packageId,'--exact'];
  switch(action){
    case 'install':return ['install',...common,'--source','winget','--accept-package-agreements','--accept-source-agreements','--disable-interactivity'];
    case 'update':return ['upgrade',...common,'--source','winget','--accept-package-agreements','--accept-source-agreements','--disable-interactivity'];
    case 'remove':return ['uninstall',...common,'--disable-interactivity'];
    default:throw new Error('지원하지 않는 명령');
  }
}
export function runWinget(args:string[],onLog?:(message:string)=>void,timeoutMs=600000):Promise<CommandResult>{
  return new Promise(resolve=>{
    const child=spawn('winget',args,{shell:false,windowsHide:true,stdio:['ignore','pipe','pipe'],env:process.env});
    let output='',settled=false;
    const finish=(result:CommandResult)=>{if(!settled){settled=true;clearTimeout(timer);resolve(result);}};
    const append=(chunk:Buffer)=>{const s=chunk.toString('utf8').replace(/\x1b\[[0-9;]*m/g,'').replace(/\r/g,'\n');output=(output+s).slice(-MAX_LOG);onLog?.(s.slice(-1000));};
    child.stdout?.on('data',append);child.stderr?.on('data',append);
    child.once('error',e=>finish({ok:false,code:null,message:e.message}));
    child.once('close',code=>finish({ok:code===0,code,message:output.trim().slice(-MAX_LOG)}));
    const timer=setTimeout(()=>{child.kill();finish({ok:false,code:null,message:'명령 실행 시간이 초과되었습니다. 실제 설치 상태를 확인하세요.'});},timeoutMs);
  });
}
export function readWingetStatus(packageId:string):Promise<'installed'|'not-installed'|'unknown'>{
  return runWinget(['list','--id',packageId,'--exact','--accept-source-agreements','--disable-interactivity'],undefined,25000)
    .then(r=>{
      if(!r.ok)return 'unknown';
      const lines=r.message.split(/\r?\n/);
      // Localized header wording is not reliable; match only the exact package ID on a result row.
      return lines.some(line=>line.trim().split(/\s+/).includes(packageId))?'installed':'not-installed';
    });
}
