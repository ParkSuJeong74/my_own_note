import {app,BrowserWindow,dialog,ipcMain,shell,session} from 'electron';
import {join} from 'node:path';
import {cpus,freemem,platform,totalmem,release} from 'node:os';
import {allowedPackage,loadCatalog} from './registry';
import {buildArgs,readWingetStatus,runWinget,WinGetAction} from './winget';
let win:BrowserWindow|null=null;
let busy=false;
function trustworthy(e:Electron.IpcMainInvokeEvent){return Boolean(win&&e.sender.id===win.webContents.id);}
function authorize(e:Electron.IpcMainInvokeEvent){if(!trustworthy(e))throw new Error('잘못된 창의 요청');}
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
app.whenReady().then(async()=>{
  const catalog=loadCatalog();
  ipcMain.handle('easyopen:machine',e=>{authorize(e);return {platform:platform(),release:release(),cpu:cpus()[0]?.model??'확인 불가',totalMemoryGb:Math.round(totalmem()/1024**3),freeMemoryGb:Math.round(freemem()/1024**3),gpu:'실제 GPU 진단 미구현',disk:'저장 공간 진단 미구현'};});
  ipcMain.handle('easyopen:status',async(e,id:unknown)=>{
    authorize(e);if(typeof id!=='string')return 'unknown';
    const pkg=allowedPackage(catalog,id);
    if(platform()!=='win32'||!pkg)return 'unknown';
    return readWingetStatus(pkg);
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
