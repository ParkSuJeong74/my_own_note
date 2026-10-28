import {app,BrowserWindow,clipboard,dialog,ipcMain,shell,session} from 'electron';
import {join} from 'node:path';
import {arch,cpus,freemem,networkInterfaces,platform,totalmem,release} from 'node:os';
import {access,statfs} from 'node:fs/promises';
import {allowedPackage,loadCatalog} from './registry';
import {buildArgs,readWingetStatus,readWingetUpdateStatus,runWinget,WinGetAction} from './winget';
import {detectNvidiaGpu,evaluateCosyVoiceReadiness,readinessBlockMessage} from './cosyvoice';
import {detectRuntime,runRuntimeAction,RuntimeAction} from './runtime';
import {ContainerAction,listManagedContainers,readManagedContainerLogs,runManagedContainerAction} from './container-manager';
import {containerAppSpec,cosyVoiceContainerSpec,loadCachedContainerImages,loadContainerImages,needsContainerUpdate,resolveContainerImages,saveCachedContainerImages,type ResolvedContainerImages} from './container-apps';
import {installContainerApp,waitForHealth,type InstallProgress} from './container-installer';
import {replaceContainerImage} from './container-updater';
import {classifyManagedNavigation,managedAppOrigin} from './embedded-app';
import {JELLYFIN_LOCAL_URL,jellyfinLanUrl,readJellyfinMacStatus,selectLanIpv4} from './jellyfin';
import {jellyfinRuntimePaths,selectJellyfinRuntime} from './jellyfin-runtime';
import {prepareWindowsJellyfinRuntime} from './jellyfin-runtime-preparer';
import {forgetManagedJellyfinRuntime,startManagedJellyfin} from './jellyfin-runtime-manager';
let win:BrowserWindow|null=null;
const managedAppWindows=new Map<string,BrowserWindow>();
let busy=false;
let managedJellyfinPid:number|null=null;
let activeContainerInstall:{id:string;controller:AbortController}|null=null;
const appIcon=join(app.getAppPath(),'build','icon.png');
function trustworthy(e:Electron.IpcMainInvokeEvent){return Boolean(win&&e.sender.id===win.webContents.id);}
function authorize(e:Electron.IpcMainInvokeEvent){if(!trustworthy(e))throw new Error('잘못된 창의 요청');}
async function openManagedAppWindow(id:string,title:string,url:string){
  const existing=managedAppWindows.get(id);
  if(existing&&!existing.isDestroyed()){existing.show();existing.focus();return true;}
  const allowedOrigin=managedAppOrigin(url);
  const child=new BrowserWindow({width:1280,height:860,minWidth:900,minHeight:640,title:`${title} | EasyOpen`,icon:appIcon,parent:win??undefined,show:false,backgroundColor:'#f7f8fc',webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,partition:`easyopen-local-${id}`}});
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
  win=new BrowserWindow({width:1200,height:820,minWidth:900,minHeight:660,title:'EasyOpen',icon:appIcon,backgroundColor:'#f7f8fc',show:false,webPreferences:{
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
  const bundledContainerImages=loadContainerImages(app.getAppPath());
  const containerImagesCache=join(app.getPath('userData'),'container-images-cache.json');
  const cachedContainerImages=loadCachedContainerImages(containerImagesCache);
  let containerImageState:ResolvedContainerImages={images:cachedContainerImages??bundledContainerImages,source:cachedContainerImages?'cache':'bundled'};
  let containerImagesRefreshedAt=0;
  let containerImagesRefresh:Promise<ResolvedContainerImages>|null=null;
  async function refreshContainerImages(force=false){
    if(!force&&Date.now()-containerImagesRefreshedAt<5*60*1000)return containerImageState;
    if(containerImagesRefresh)return containerImagesRefresh;
    containerImagesRefresh=resolveContainerImages({bundled:bundledContainerImages,cached:loadCachedContainerImages(containerImagesCache)}).then(result=>{
      containerImageState=result;containerImagesRefreshedAt=Date.now();
      if(result.source==='remote')saveCachedContainerImages(containerImagesCache,result.images);
      return result;
    }).finally(()=>{containerImagesRefresh=null;});
    return containerImagesRefresh;
  }
  void refreshContainerImages();
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
  ipcMain.handle('easyopen:container-app-status',async(e,id:unknown)=>{
    authorize(e);
    if(typeof id!=='string'||platform()!=='win32')return {available:false,message:'현재 Windows에서만 제공하는 시험 기능입니다.'};
    try{
      const resolved=await refreshContainerImages();const spec=containerAppSpec(id,resolved.images);
      if(!spec)return {available:false,updateAvailable:false,source:resolved.source,message:'검증된 CosyVoice 이미지 digest가 아직 등록되지 않았습니다.'};
      const installed=(await listManagedContainers()).find(container=>container.name===spec.containerName);
      const updateAvailable=needsContainerUpdate(installed?.image,spec.image);
      return {available:true,updateAvailable,source:resolved.source,installedImage:installed?.image,availableImage:spec.image,message:updateAvailable?'새 CosyVoice 이미지가 준비되었습니다. 모델 데이터는 보존한 채 업데이트할 수 있습니다.':`승인된 컨테이너 이미지가 준비되었습니다. · ${resolved.source}`};
    }
    catch(error){return {available:false,message:error instanceof Error?error.message:'컨테이너 앱 명세를 확인하지 못했습니다.'};}
  });
  ipcMain.handle('easyopen:install-container-app',async(e,id:unknown)=>{
    authorize(e);
    if(platform()!=='win32'||typeof id!=='string')return {ok:false,message:'현재 Windows에서만 제공하는 시험 기능입니다.'};
    if(busy)return {ok:false,message:'다른 설치 작업이 진행 중입니다.'};
    const resolved=await refreshContainerImages();const spec=containerAppSpec(id,resolved.images);
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
  ipcMain.handle('easyopen:update-container-app',async(e,id:unknown)=>{
    authorize(e);
    if(platform()!=='win32'||id!=='cosyvoice')return {ok:false,message:'현재 Windows CosyVoice만 업데이트할 수 있습니다.'};
    if(busy)return {ok:false,message:'다른 설치 작업이 진행 중입니다.'};
    const resolved=await refreshContainerImages(true);const nextSpec=containerAppSpec(id,resolved.images);
    if(!nextSpec)return {ok:false,message:'업데이트할 승인 이미지가 없습니다.'};
    const installed=(await listManagedContainers()).find(container=>container.name===nextSpec.containerName);
    if(!installed)return {ok:false,message:'설치된 CosyVoice 컨테이너가 없습니다.'};
    if(!needsContainerUpdate(installed.image,nextSpec.image))return {ok:true,message:'이미 최신 CosyVoice 이미지입니다.'};
    let previousSpec;
    try{previousSpec=cosyVoiceContainerSpec(installed.image);}catch{return {ok:false,message:'현재 컨테이너의 이미지 digest를 검증할 수 없어 자동 업데이트하지 않습니다.'};}
    if(!previousSpec)return {ok:false,message:'현재 컨테이너의 복구 이미지를 확인하지 못했습니다.'};
    const blocked=readinessBlockMessage(await readCosyVoiceReadiness());if(blocked)return {ok:false,message:blocked};
    const choice=await dialog.showMessageBox(win!,{type:'warning',title:'CosyVoice 이미지 업데이트',message:'새 CosyVoice 이미지로 업데이트할까요?',detail:`현재: ${installed.image}\n새 이미지: ${nextSpec.image}\n컨테이너는 교체하지만 모델 volume과 사용자 결과물은 보존합니다. 새 이미지 준비에 실패하면 이전 digest 복구를 시도합니다.`,buttons:['취소','업데이트'],defaultId:0,cancelId:0,noLink:true});
    if(choice.response!==1)return {ok:false,message:'사용자가 취소했습니다.'};
    const controller=new AbortController();activeContainerInstall={id,controller};busy=true;
    const health=(url:string,signal?:AbortSignal)=>waitForHealth(url,600,3000,fetch,signal);
    const log=(message:string)=>win?.webContents.send('easyopen:runtime-log',message);
    const progress=(value:InstallProgress)=>win?.webContents.send('easyopen:container-install-progress',id,value);
    try{
      return await replaceContainerImage({previous:previousSpec,next:nextSpec,remove:name=>runManagedContainerAction('remove',name),install:spec=>installContainerApp(spec,undefined,health,log,spec.image===nextSpec.image?controller.signal:undefined,progress),log});
    }finally{activeContainerInstall=null;busy=false;}
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
    const spec=containerAppSpec(id,containerImageState.images);
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
  ipcMain.handle('easyopen:jellyfin-status',async e=>{
    authorize(e);
    if(platform()==='darwin')return readJellyfinMacStatus(app.getPath('home'));
    const candidate=selectJellyfinRuntime(platform(),arch());
    if(!candidate)return {supported:false,installed:false,running:false,appPath:null,url:JELLYFIN_LOCAL_URL,message:'이 운영체제·CPU 조합의 Jellyfin 사용 준비는 아직 검증되지 않았습니다.'};
    const executable=jellyfinRuntimePaths(app.getPath('userData'),candidate).executable;
    let installed=false;try{await access(executable);installed=true;}catch{installed=false;}
    let running=false;try{const response=await fetch(`${JELLYFIN_LOCAL_URL}/System/Info/Public`,{signal:AbortSignal.timeout(1500)});running=response.ok&&response.headers.get('content-type')?.includes('application/json')===true;}catch{running=false;}
    return {supported:true,installed,running,appPath:installed?executable:null,url:JELLYFIN_LOCAL_URL,message:running?'Jellyfin을 이 PC에서 사용 중입니다.':installed?'Jellyfin 사용 준비가 완료됐지만 현재는 멈춰 있습니다.':'Jellyfin을 사용하려면 먼저 사용 준비가 필요합니다.'};
  });
  ipcMain.handle('easyopen:jellyfin-action',async(e,action:unknown)=>{
    authorize(e);
    if(!['prepare','launch','open','forget'].includes(String(action)))return {ok:false,message:'허용되지 않은 Jellyfin 작업입니다.'};
    if(platform()==='win32'){
      const candidate=selectJellyfinRuntime(platform(),arch());
      if(!candidate)return {ok:false,message:'이 Windows CPU의 Jellyfin 관리형 사용은 아직 검증되지 않았습니다.'};
      if(action==='open'){
        try{await openManagedAppWindow('jellyfin','Jellyfin',JELLYFIN_LOCAL_URL);return {ok:true,message:'Jellyfin을 열었습니다.'};}
        catch{return {ok:false,message:'Jellyfin 화면을 열지 못했습니다. 먼저 다시 사용하기를 선택해 주세요.'};}
      }
      if(busy)return {ok:false,message:'다른 준비 작업이 진행 중입니다.'};
      if(action==='forget'){
        let running=false;try{const response=await fetch(`${JELLYFIN_LOCAL_URL}/System/Info/Public`,{signal:AbortSignal.timeout(1500)});running=response.ok;}catch{running=false;}
        if(running)return {ok:false,message:'실행 중인 Jellyfin을 강제로 종료하지 않습니다. 안전한 종료 기능이 준비될 때까지 Jellyfin 관리자 화면에서 종료한 뒤 다시 시도해 주세요.'};
        const choice=await dialog.showMessageBox(win!,{type:'warning',title:'Jellyfin 더 이상 사용하지 않기',message:'이 PC에서 Jellyfin을 더 이상 사용하지 않을까요?',detail:'EasyOpen이 준비한 Jellyfin Runtime만 정리합니다. Jellyfin 설정·라이브러리 DB·캐시·로그와 사용자의 원본 미디어는 삭제하지 않습니다.',buttons:['취소','더 이상 사용하지 않기'],defaultId:0,cancelId:0,noLink:true});
        if(choice.response!==1)return {ok:false,message:'변경하지 않았습니다.'};
        busy=true;
        try{
          await forgetManagedJellyfinRuntime(app.getPath('userData'),candidate);
          return {ok:true,message:'Jellyfin 사용을 중단했습니다. 설정·라이브러리와 원본 미디어는 보존했습니다.'};
        }catch(error){return {ok:false,message:error instanceof Error?error.message:'Jellyfin Runtime을 정리하지 못했습니다.'};}
        finally{busy=false;}
      }
      if(action==='prepare'){
        const choice=await dialog.showMessageBox(win!,{type:'info',title:'Jellyfin 사용 준비',message:'EasyOpen에서 Jellyfin을 사용할까요?',detail:`Jellyfin ${candidate.version} 공식 Windows Runtime을 내려받아 서명과 SHA-256을 확인한 뒤 EasyOpen 전용 폴더에 준비합니다. 약 120 MB의 네트워크와 추가 저장 공간을 사용합니다. Jellyfin은 무료 오픈소스이며 미디어 원본은 수정하거나 삭제하지 않습니다.`,buttons:['취소','사용하기'],defaultId:0,cancelId:0,noLink:true});
        if(choice.response!==1)return {ok:false,message:'사용 준비를 취소했습니다.'};
        busy=true;
        try{const result=await prepareWindowsJellyfinRuntime(app.getPath('userData'),candidate,undefined,value=>win?.webContents.send('easyopen:jellyfin-prepare-progress',value));return {ok:true,message:result.alreadyPrepared?'Jellyfin 사용 준비를 다시 확인했습니다.':'Jellyfin 사용 준비를 마쳤습니다. 이제 다시 사용하기를 선택하세요.'};}
        catch(error){return {ok:false,message:error instanceof Error?error.message:'Jellyfin 사용 준비를 완료하지 못했습니다.'};}
        finally{busy=false;}
      }
      busy=true;
      try{
        await prepareWindowsJellyfinRuntime(app.getPath('userData'),candidate);
        const started=await startManagedJellyfin(app.getPath('userData'),candidate,undefined,()=>{if(managedJellyfinPid===started.pid)managedJellyfinPid=null;});
        managedJellyfinPid=started.pid;
        return {ok:true,message:'Jellyfin을 시작했습니다. 사용할 준비가 되면 상태를 다시 확인해 주세요.'};
      }catch(error){return {ok:false,message:error instanceof Error?error.message:'Jellyfin을 시작하지 못했습니다.'};}
      finally{busy=false;}
    }
    if(platform()!=='darwin'||['prepare','forget'].includes(String(action)))return {ok:false,message:'macOS 공식 Runtime의 서명 검증 후보를 확보할 때까지 이 관리 작업을 제공하지 않습니다.'};
    const status=await readJellyfinMacStatus(app.getPath('home'));
    if(action==='open'){
      if(!status.running)return {ok:false,message:'Jellyfin이 아직 준비되지 않았습니다. 먼저 다시 사용하기를 선택해 주세요.'};
      try{await openManagedAppWindow('jellyfin','Jellyfin',JELLYFIN_LOCAL_URL);return {ok:true,message:'Jellyfin을 열었습니다.'};}
      catch{return {ok:false,message:'Jellyfin 화면을 열지 못했습니다.'};}
    }
    if(!status.appPath)return {ok:false,message:'Jellyfin 사용 준비가 아직 끝나지 않았습니다.'};
    const result=await shell.openPath(status.appPath);
    return result?{ok:false,message:`Jellyfin을 시작하지 못했습니다: ${result}`}:{ok:true,message:'Jellyfin을 시작했습니다. 사용할 준비가 되면 상태를 다시 확인해 주세요.'};
  });
  ipcMain.handle('easyopen:jellyfin-connection',e=>{
    authorize(e);
    const lanUrl=jellyfinLanUrl(selectLanIpv4(networkInterfaces()));
    return lanUrl?{available:true,lanUrl,message:'같은 Wi-Fi의 Jellyfin 공식 앱에 이 주소를 입력하세요.'}:{available:false,lanUrl:null,message:'사용 가능한 사설 LAN 주소를 찾지 못했습니다. Wi-Fi 연결을 확인해 주세요.'};
  });
  ipcMain.handle('easyopen:jellyfin-copy-address',e=>{
    authorize(e);
    const lanUrl=jellyfinLanUrl(selectLanIpv4(networkInterfaces()));
    if(!lanUrl)return {ok:false,message:'복사할 LAN 주소를 찾지 못했습니다.'};
    clipboard.writeText(lanUrl);return {ok:true,message:'Jellyfin LAN 주소를 클립보드에 복사했습니다.'};
  });
  ipcMain.handle('easyopen:jellyfin-select-media-folder',async e=>{
    authorize(e);
    if(!['darwin','win32'].includes(platform()))return {ok:false,message:'현재 macOS와 Windows에서만 미디어 폴더 선택을 지원합니다.'};
    const selected=await dialog.showOpenDialog(win!,{title:'Jellyfin에서 사용할 미디어 폴더 선택',properties:['openDirectory','createDirectory'],securityScopedBookmarks:false,message:'EasyOpen은 선택한 폴더의 파일을 수정하거나 삭제하지 않습니다.',buttonLabel:'이 폴더 선택'});
    if(selected.canceled||selected.filePaths.length!==1)return {ok:false,message:'폴더 선택을 취소했습니다.'};
    return {ok:true,path:selected.filePaths[0],message:'폴더를 선택했습니다. Jellyfin 설정 화면에서 라이브러리에 추가해 주세요.'};
  });
  ipcMain.handle('easyopen:status',async(e,id:unknown)=>{
    authorize(e);if(typeof id!=='string')return 'unknown';
    if(platform()==='darwin'&&id==='jellyfin')return (await readJellyfinMacStatus(app.getPath('home'))).installed?'installed':'not-installed';
    if(platform()==='win32'&&id==='jellyfin'){
      const candidate=selectJellyfinRuntime(platform(),arch());if(!candidate)return 'unknown';
      try{await access(jellyfinRuntimePaths(app.getPath('userData'),candidate).executable);return 'installed';}catch{return 'not-installed';}
    }
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
