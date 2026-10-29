import {autoUpdater,type ProgressInfo} from 'electron-updater';

export type AppUpdateState={
  state:'disabled'|'idle'|'checking'|'current'|'available'|'downloading'|'downloaded'|'error';
  currentVersion:string;
  availableVersion:string|null;
  percent:number|null;
  message:string;
};

let snapshot:AppUpdateState={state:'disabled',currentVersion:'0.0.0',availableVersion:null,percent:null,message:'이 빌드에서는 앱 업데이트를 사용할 수 없습니다.'};
let configured=false;
let notify:(value:AppUpdateState)=>void=()=>undefined;

function update(next:Partial<AppUpdateState>){snapshot={...snapshot,...next};notify(snapshot);return snapshot;}
function errorMessage(error:unknown){return error instanceof Error?error.message:'업데이트를 확인하지 못했습니다.';}

export function configureAppUpdater(options:{enabled:boolean;currentVersion:string;onChange:(value:AppUpdateState)=>void}){
  notify=options.onChange;
  snapshot={state:options.enabled?'idle':'disabled',currentVersion:options.currentVersion,availableVersion:null,percent:null,message:options.enabled?'새 버전이 있는지 확인할 수 있습니다.':'서명된 공개 빌드에서만 앱 업데이트를 사용할 수 있습니다.'};
  if(!options.enabled||configured)return snapshot;
  configured=true;
  autoUpdater.autoDownload=false;
  autoUpdater.autoInstallOnAppQuit=false;
  autoUpdater.allowPrerelease=true;
  autoUpdater.on('checking-for-update',()=>update({state:'checking',percent:null,message:'새 버전을 확인하고 있습니다…'}));
  autoUpdater.on('update-available',info=>update({state:'available',availableVersion:info.version,percent:null,message:`EasyOpen ${info.version} 업데이트가 준비되었습니다.`}));
  autoUpdater.on('update-not-available',()=>update({state:'current',availableVersion:null,percent:null,message:'현재 최신 버전을 사용하고 있습니다.'}));
  autoUpdater.on('download-progress',(progress:ProgressInfo)=>update({state:'downloading',percent:Math.max(0,Math.min(100,Math.round(progress.percent))),message:`업데이트 다운로드 중 · ${Math.round(progress.percent)}%`}));
  autoUpdater.on('update-downloaded',info=>update({state:'downloaded',availableVersion:info.version,percent:100,message:'업데이트를 설치할 준비가 됐습니다. 재시작하면 적용됩니다.'}));
  autoUpdater.on('error',error=>update({state:'error',percent:null,message:errorMessage(error)}));
  return snapshot;
}

export function appUpdateStatus(){return snapshot;}

export async function checkAppUpdate(){
  if(snapshot.state==='disabled')return snapshot;
  update({state:'checking',percent:null,message:'새 버전을 확인하고 있습니다…'});
  try{await autoUpdater.checkForUpdates();}catch(error){update({state:'error',percent:null,message:errorMessage(error)});}
  return snapshot;
}

export async function downloadAppUpdate(){
  if(snapshot.state!=='available')return snapshot;
  try{update({state:'downloading',percent:0,message:'업데이트 다운로드를 시작합니다…'});await autoUpdater.downloadUpdate();}
  catch(error){update({state:'error',percent:null,message:errorMessage(error)});}
  return snapshot;
}

export function installAppUpdate(){
  if(snapshot.state!=='downloaded')return false;
  autoUpdater.quitAndInstall(false,true);
  return true;
}
