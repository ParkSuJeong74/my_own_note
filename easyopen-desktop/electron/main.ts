import {app,BrowserWindow,dialog,ipcMain,shell,session} from 'electron';
import {join} from 'node:path';
import {cpus,freemem,platform,totalmem,release} from 'node:os';
import {access,statfs} from 'node:fs/promises';
import {allowedPackage,loadCatalog} from './registry';
import {buildArgs,readWingetStatus,readWingetUpdateStatus,runWinget,WinGetAction} from './winget';
import {detectNvidiaGpu,evaluateCosyVoiceReadiness,readinessBlockMessage} from './cosyvoice';
import {detectRuntime,runRuntimeAction,RuntimeAction} from './runtime';
import {ContainerAction,listManagedContainers,readManagedContainerLogs,runManagedContainerAction} from './container-manager';
import {containerAppSpec,loadContainerImages} from './container-apps';
import {installContainerApp,waitForHealth} from './container-installer';
import {classifyManagedNavigation,managedAppOrigin} from './embedded-app';
let win:BrowserWindow|null=null;
const managedAppWindows=new Map<string,BrowserWindow>();
let busy=false;
let activeContainerInstall:{id:string;controller:AbortController}|null=null;
function trustworthy(e:Electron.IpcMainInvokeEvent){return Boolean(win&&e.sender.id===win.webContents.id);}
function authorize(e:Electron.IpcMainInvokeEvent){if(!trustworthy(e))throw new Error('잘못된 창의 요청');}
async function openManagedAppWindow(id:string,title:string,url:string){
  const existing=managedAppWindows.get(id);
  if(existing&&!existing.isDestroyed()){existing.show();existing.focus();return true;}
  const allowedOrigin=managedAppOrigin(url);
  const child=new BrowserWindow({width:1280,height:860,minWidth:900,minHeight:640,title:`${title} | EasyOpen`,parent:win??undefined,show:false,backgroundColor:'#f7f8fc',webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,partition:`easyopen-local-${id}`}});
  managedAppWindows.set(id,child);
  child.once('ready-to-show',()=>child.show());
  child.on('closed',()=>managedAppWindows.delete(id));
  child.webContents.session.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  child.webContents.setWindowOpenHandler(({url:target})=>{
    const action=classifyManagedNavigation(target,allowedOrigin);
    if(action==='external')void shell.openExternal(target);
    else if(action==='internal')void child.loadURL(target);
    return {action:'deny'};
  });
  child.webContents.on('will-navigate',(event,target)=>{
    const action=classifyManagedNavigation(target,allowedOrigin);
    if(action==='internal')return;
    event.preventDefault();
    if(action==='external')void shell.openExternal(target);
  });
  await child.loadURL(url);
  return true;
}
async function create(){
  win=new BrowserWindow({width:1200,height:820,minWidth:900,minHeight:660,title:'EasyOpen',backgroundColor:'#f7f8fc',show:false,webPreferences:{
    preload:join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,
  }});
  win.once('ready-to-show',()=>win?.show());
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',e=>e.preventDefault());
  session.defaultSession.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));
  if(process.env.EASYOPEN_DEV_URL==='http://127.0.0.1:5173'&&!app.isPackaged)await win.loadURL(process.env.EASYOPEN_DEV_URL);
  else await win.loadFile(join(app.getAppPath(),'dist','index.html'));
}
async function readCosyVoiceReadiness(){
  let freeDiskGb:number|null=null;
  try{const disk=await statfs(app.getPath('userData'));freeDiskGb=Math.floor(Number(disk.bavail)*Number(disk.bsize)/1024**3);}
  catch{freeDiskGb=null;}
  const [gpu,runtime]=await Promise.all([platform()==='win32'?detectNvidiaGpu():Promise.resolve(null),detectRuntime(platform())]);
  return evaluateCosyVoiceReadiness({platform:platform(),memoryGb:Math.round(totalmem()/1024**3),freeDiskGb,gpu,runtime});
}
app.whenReady().then(async()=>{
  const catalog=loadCatalog();
  const containerImages=loadContainerImages(app.getAppPath());
  ipcMain.handle('easyopen:machine',e=>{authorize(e);return {platform:platform(),release:release(),cpu:cpus()[0]?.model??'확인 불가',totalMemoryGb:Math.round(totalmem()/1024**3),freeMemoryGb:Math.round(freemem()/1024**3),gpu:'실제 GPU 진단 미구현',disk:'저장 공간 진단 미구현'};});
  ipcMain.handle('easyopen:runtime-status',e=>{authorize(e);return detectRuntime(platform());});
  ipcMain.handle('easyopen:runtime-action',async(e,action:unknown)=>{
    authorize(e);
    if(platform()!=='win32')return {ok:false,message:'EasyOpen Runtime 자동 준비는 현재 Windows에서만 지원합니다.'};
    if(busy)return {ok:false,message:'다른 설치 작업이 진행 중입니다.'};
    if(action==='start-docker'){
      const candidates=[process.env.LOCALAPPDATA&&join(process.env.LOCALAPPDATA,'Programs','Docker','Docker','Docker Desktop.exe'),process.env.ProgramFiles&&join(process.env.ProgramFiles,'Docker','Docker','Docker Desktop.exe')].filter((value):value is string=>Boolean(value));
      for(const candidate of candidates){try{await access(candidate);const error=await shell.openPath(candidate);return error?{ok:false,message:error}:{ok:true,message:'Docker Desktop을 시작했습니다. Engine 준비 후 다시 확인하세요.'};}catch{continue;}}
      return {ok:false,message:'Docker Desktop 실행 파일을 찾지 못했습니다. 직접 실행한 뒤 다시 확인하세요.'};
    }
    if(!['install-wsl','install-docker'].includes(String(action)))return {ok:false,message:'허용되지 않은 Runtime 작업입니다.'};
    const selected=action as RuntimeAction;
    const detail=selected==='install-wsl'
      ?'Microsoft WSL2 기능을 설치합니다. 관리자 승인과 Windows 재부팅이 필요할 수 있습니다.'
      :'공식 WinGet 패키지 Docker.DockerDesktop을 설치합니다. Docker 이용약관과 조직별 유료 조건을 확인해야 합니다.';
    const choice=await dialog.showMessageBox(win!,{type:'warning',title:'EasyOpen Runtime 준비',message:selected==='install-wsl'?'WSL2를 설치할까요?':'Docker Desktop을 설치할까요?',detail,buttons:['취소','설치'],defaultId:0,cancelId:0,noLink:true});
    if(choice.response!==1)return {ok:false,message:'사용자가 취소했습니다.'};
    busy=true;
    try{return await runRuntimeAction(selected,message=>win?.webContents.send('easyopen:runtime-log',message));}
    finally{busy=false;}
  });
  ipcMain.handle('easyopen:containers',async e=>{authorize(e);if(platform()!=='win32')return [];try{return await listManagedContainers();}catch{return [];}});
  ipcMain.handle('easyopen:container-action',async(e,action:unknown,name:unknown)=>{
    authorize(e);
    if(platform()!=='win32'||typeof name!=='string'||!['start','stop','restart','remove'].includes(String(action)))return {ok:false,message:'허용되지 않은 컨테이너 작업입니다.'};
    if(busy)return {ok:false,message:'다른 설치 작업이 진행 중입니다.'};
    const kind=action as ContainerAction;
    const destructive=kind==='remove';
    const choice=await dialog.showMessageBox(win!,{type:destructive?'warning':'question',title:'EasyOpen 컨테이너 관리',message:`${name} · ${kind}`,detail:destructive?'컨테이너를 제거합니다. 연결된 모델 volume과 결과물은 이 작업에서 삭제하지 않습니다.':'EasyOpen이 관리하는 컨테이너에만 작업을 실행합니다.',buttons:['취소','계속'],defaultId:0,cancelId:0,noLink:true});
    if(choice.response!==1)return {ok:false,message:'사용자가 취소했습니다.'};
    busy=true;try{return await runManagedContainerAction(kind,name);}finally{busy=false;}
  });
  ipcMain.handle('easyopen:container-logs',async(e,name:unknown)=>{authorize(e);if(platform()!=='win32'||typeof name!=='string')return '';try{return await readManagedContainerLogs(name);}catch(error){return error instanceof Error?error.message:'로그를 읽지 못했습니다.';}});
  ipcMain.handle('easyopen:container-app-status',(e,id:unknown)=>{
    authorize(e);
    if(typeof id!=='string'||platform()!=='win32')return {available:false,message:'현재 Windows에서만 제공하는 시험 기능입니다.'};
    try{return containerAppSpec(id,containerImages)?{available:true,message:'승인된 컨테이너 이미지가 준비되었습니다.'}:{available:false,message:'서명·검증된 CosyVoice 이미지 digest가 아직 배포판에 등록되지 않았습니다.'};}
    catch(error){return {available:false,message:error instanceof Error?error.message:'컨테이너 앱 명세를 확인하지 못했습니다.'};}
  });
  ipcMain.handle('easyopen:install-container-app',async(e,id:unknown)=>{
    authorize(e);
    if(platform()!=='win32'||typeof id!=='string')return {ok:false,message:'현재 Windows에서만 제공하는 시험 기능입니다.'};
    if(busy)return {ok:false,message:'다른 설치 작업이 진행 중입니다.'};
    const spec=containerAppSpec(id,containerImages);
    if(!spec)return {ok:false,message:'승인된 이미지 digest가 없어 설치할 수 없습니다.'};
    const blocked=readinessBlockMessage(await readCosyVoiceReadiness());
    if(blocked)return {ok:false,message:blocked};
    const target=catalog.find(item=>item.id===id);
    if(!target)return {ok:false,message:'카탈로그에 없는 앱입니다.'};
    const choice=await dialog.showMessageBox(win!,{type:'warning',title:'EasyOpen 컨테이너 앱 설치',message:`${target.name}을 설치할까요?`,detail:`이미지: ${spec.image}\nGPU를 사용하며 모델 파일은 ${spec.volumes[0].name} volume에 보존됩니다. Web UI는 이 PC의 127.0.0.1:${spec.ports[0].host}에만 열립니다.`,buttons:['취소','설치'],defaultId:0,cancelId:0,noLink:true});
    if(choice.response!==1)return {ok:false,message:'사용자가 취소했습니다.'};
    const controller=new AbortController();activeContainerInstall={id,controller};busy=true;
    try{return await installContainerApp(spec,undefined,(url,signal)=>waitForHealth(url,600,3000,fetch,signal),message=>win?.webContents.send('easyopen:runtime-log',message),controller.signal,value=>win?.webContents.send('easyopen:container-install-progress',id,value));}
    finally{activeContainerInstall=null;busy=false;}
  });
  ipcMain.handle('easyopen:cancel-container-install',(e,id:unknown)=>{
    authorize(e);
    if(typeof id!=='string'||activeContainerInstall?.id!==id)return {ok:false,message:'취소할 컨테이너 설치 작업이 없습니다.'};
    activeContainerInstall.controller.abort();
    return {ok:true,message:'설치 취소를 요청했습니다. 정리 작업이 끝날 때까지 기다려 주세요.'};
  });
  ipcMain.handle('easyopen:open-container-app',async(e,id:unknown)=>{
    authorize(e);
    if(typeof id!=='string')return false;
    const spec=containerAppSpec(id,containerImages);
    if(!spec)return false;
    const target=catalog.find(item=>item.id===id);
    if(!target)return false;
    try{return await openManagedAppWindow(id,target.name,spec.healthUrl);}
    catch{return false;}
  });
  ipcMain.handle('easyopen:cosyvoice-readiness',async e=>{
    authorize(e);
    return readCosyVoiceReadiness();
  });
  ipcMain.handle('easyopen:status',async(e,id:unknown)=>{
    authorize(e);if(typeof id!=='string')return 'unknown';
    const pkg=allowedPackage(catalog,id);
    if(platform()!=='win32'||!pkg)return 'unknown';
    return readWingetStatus(pkg);
  });
  ipcMain.handle('easyopen:update-status',async(e,id:unknown)=>{
    authorize(e);if(typeof id!=='string')return 'unknown';
    const pkg=allowedPackage(catalog,id);
    if(platform()!=='win32'||!pkg)return 'unknown';
    return readWingetUpdateStatus(pkg);
  });
  ipcMain.handle('easyopen:action',async(e,id:unknown,kind:unknown)=>{
    authorize(e);
    if(platform()!=='win32')return {ok:false,message:'현재 설치/관리 기능은 Windows의 WinGet에서만 작동합니다.'};
    if(busy)return {ok:false,message:'다른 설치 작업이 진행 중입니다.'};
    const pkg=typeof id==='string'?allowedPackage(catalog,id):null;
    if(!pkg||!['install','update','remove'].includes(String(kind)))return {ok:false,message:'검증 대상 목록에 없는 작업입니다.'};
    const target=catalog.find(a=>a.id===id)!;
    const message=kind==='remove'?'앱 설정 또는 데이터에 영향을 줄 수 있습니다.': '설치 및 업데이트 과정에서 시스템 권한 승인이 필요할 수 있습니다.';
    const choice=await dialog.showMessageBox(win!,{type:'warning',title:'EasyOpen 작업 최종 확인',message:`${target.name} · ${kind==='install'?'설치':kind==='update'?'업데이트':'제거'}`,detail:`WinGet 패키지: ${pkg}\nWindows 실기기에서 검증되지 않은 시험 기능입니다.\n${message}`,buttons:['취소','계속'],defaultId:0,cancelId:0,noLink:true});
    if(choice.response!==1)return {ok:false,message:'사용자가 취소했습니다.'};
    busy=true;
    try{ return await runWinget(buildArgs(kind as WinGetAction,pkg),msg=>win?.webContents.send('easyopen:log',id,msg));}
    finally{busy=false;}
  });
  ipcMain.handle('easyopen:official',async(e,id:unknown)=>{
    authorize(e);
    const a=typeof id==='string'?catalog.find(a=>a.id===id):undefined;
    if(!a)return false;
    const url=new URL(a.officialUrl);
    if(url.protocol!=='https:'||url.username||url.password)return false;
    await shell.openExternal(url.toString());return true;
  });
  await create();
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)void create();});
