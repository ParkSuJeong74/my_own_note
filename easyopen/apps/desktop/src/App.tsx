import {useEffect, useMemo, useRef, useState} from 'react';
import {
  Activity, ArrowRight, ArrowUpRight,
  Check, CheckCircle2, ChevronDown, ChevronRight, CircleAlert, CircleHelp,
  ExternalLink, FileAudio, FileText, FolderHeart, HardDrive,
  Home, Info, Laptop, ListFilter, LoaderCircle, Mic2, Monitor,
  Package, PackageCheck, RefreshCw, Search, Settings2, Square, Play,
  ShieldCheck, Sparkles, Video, WandSparkles, Wifi, X,
  type LucideIcon,
} from 'lucide-react';
import data from '../resources/catalog.json';
import type {Action, AppUpdateState, CatalogApp, ContainerAppStatus, ContainerInstallProgress, CosyVoiceReadiness, JellyfinPrepareProgress, JellyfinStatus, Machine, ManagedContainer, RuntimeStatus} from './types';
import {canTryWinget, catalogSummary, desktopPlatform, getActionLabel, needsContainerRuntime, statusText, visibleApps, type InstallStatus, type Page, type StatusMap, type UpdateMap} from './view-model';
import {loadManagedAppIds,recordManagedAction} from './ownership';
import QRCode from 'qrcode';
import {desktopJellyfinGuide} from './jellyfin-guide';

const apps = data as CatalogApp[];
const pageLabels: Record<Page,string> = {home:'홈', discover:'프로그램 탐색',installed:'내 프로그램',updates:'업데이트',library:'보관함',tasks:'작업 센터',runtime:'Runtime'};
const pageSubtitles:Record<Page,string>={
  home:'내 PC와 프로그램 상태를 한눈에 관리하세요.',
  discover:'필요한 도구를 찾고, 설치하기 전에 자세히 살펴보세요.',
  installed:'현재 기기에서 감지한 프로그램을 확인하세요.',
  updates:'EasyOpen으로 설치한 프로그램의 확인된 업데이트만 표시해요.',
  library:'관심 있는 프로그램을 모아 두고 필요할 때 찾아보세요.',
  tasks:'설치·업데이트·제거 결과와 실패 원인을 확인하세요.',
  runtime:'EasyOpen이 설치한 컨테이너의 실행 상태와 로그를 관리하세요.',
};
const operations:Record<Action,string>={install:'설치',update:'업데이트',remove:'제거'};
const navigation: {page:Page; label:string;icon:LucideIcon}[] = [
  {page:'home',label:'홈',icon:Home},
  {page:'discover',label:'프로그램 탐색',icon:Search},
  {page:'installed',label:'내 프로그램',icon:PackageCheck},
  {page:'updates',label:'업데이트',icon:RefreshCw},
  {page:'library',label:'보관함',icon:FolderHeart},
  {page:'tasks',label:'작업 센터',icon:Activity},
  {page:'runtime',label:'Runtime',icon:HardDrive},
];
type TaskRecord={id:string;appId:string;appName:string;action:Action;state:'running'|'success'|'failed'|'cancelled';message:string;createdAt:string;progress?:number;stage?:ContainerInstallProgress['stage']};

function AppIcon({app,size='md'}:{app:CatalogApp;size?:'md'|'lg'}){
  const Icon=app.id==='cosyvoice'?Mic2:
    app.id==='obs-studio'?Video:
    app.id==='localsend'?Wifi:
    app.id==='handbrake'?FileAudio:
    app.category.includes('AI')?WandSparkles:
    app.category.includes('영상')?Video:
    app.category.includes('문서')?FileText:
    app.category.includes('파일')?HardDrive:Package;
  return <span className={`program-icon program-${app.id} icon-${size}`} aria-hidden="true"><Icon size={size==='lg'?28:21} strokeWidth={1.8}/></span>;
}

function StateTag({state,connected,managed=false}:{state:InstallStatus;connected:boolean;managed?:boolean}){
  const tone=connected && state==='installed'?'positive':connected && state==='not-installed'?'neutral':'muted';
  return <span className={`state-tag state-${tone}`}><span className="state-indicator"/>{statusText(state,connected,managed)}</span>;
}

function Readiness({machine,connected}:{machine:Machine|null;connected:boolean}){
  if(!connected)return <span className="env-pill muted"><Monitor size={14}/> 화면 미리보기</span>;
  if(machine?.platform==='win32')return <span className="env-pill"><CheckCircle2 size={14}/> Windows 환경</span>;
  if(machine?.platform==='darwin')return <span className="env-pill"><CheckCircle2 size={14}/> macOS 개발 환경</span>;
  if(machine)return <span className="env-pill muted"><Laptop size={14}/> {machine.platform} · 설치 관리 미지원</span>;
  return <span className="env-pill muted"><LoaderCircle size={14}/> PC 정보 확인 중</span>;
}

function loadSaved():string[]{
  try{
    const parsed:unknown=JSON.parse(localStorage.getItem('easyopen-favorites')??'[]');
    return Array.isArray(parsed)?parsed.filter((v):v is string=>typeof v==='string'):[];
  }catch{return [];}
}
function loadTasks():TaskRecord[]{
  try{const value:unknown=JSON.parse(localStorage.getItem('easyopen-tasks')??'[]');return Array.isArray(value)?value.slice(0,50) as TaskRecord[]:[];}catch{return [];}
}

function ProgramRow({app,state,connected,managed,onDetails,onPrimary,nativeWindows,primaryLabel}:{
  app:CatalogApp;state:InstallStatus;connected:boolean;managed:boolean;nativeWindows:boolean;onDetails:()=>void;onPrimary:()=>void;primaryLabel?:string;
}){
  const action=primaryLabel??getActionLabel(app,state,nativeWindows);
  return <div className="program-row">
    <button type="button" className="program-identity" onClick={onDetails} aria-label={`${app.name} 상세 보기`}>
      <AppIcon app={app}/>
      <span className="program-copy"><strong>{app.name}</strong><small>{app.summary}</small></span>
    </button>
    <span className="row-category">{app.category}</span>
    <StateTag state={state} connected={connected} managed={managed}/>
    <div className="row-actions">
      <button type="button" className="row-secondary" onClick={onDetails}>자세히</button>
      <button type="button" className="row-primary" onClick={onPrimary}>{action}<ArrowUpRight size={14}/></button>
    </div>
  </div>;
}

export default function App(){
  const [page,setPage]=useState<Page>('home');
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('전체');
  const [selected,setSelected]=useState<CatalogApp|null>(null);
  const [advanced,setAdvanced]=useState(false);
  const [machine,setMachine]=useState<Machine|null>(null);
  const [appUpdate,setAppUpdate]=useState<AppUpdateState|null>(null);
  const [runtime,setRuntime]=useState<RuntimeStatus|null>(null);
  const [runtimeChecking,setRuntimeChecking]=useState(false);
  const [runtimeBusy,setRuntimeBusy]=useState(false);
  const [runtimeLog,setRuntimeLog]=useState('');
  const [containers,setContainers]=useState<ManagedContainer[]>([]);
  const [cosyvoiceReadiness,setCosyvoiceReadiness]=useState<CosyVoiceReadiness|null>(null);
  const [cosyvoiceContainer,setCosyvoiceContainer]=useState<ContainerAppStatus|null>(null);
  const [jellyfin,setJellyfin]=useState<JellyfinStatus|null>(null);
  const [jellyfinLanUrl,setJellyfinLanUrl]=useState<string|null>(null);
  const [jellyfinQr,setJellyfinQr]=useState<string|null>(null);
  const [jellyfinMediaFolder,setJellyfinMediaFolder]=useState<string|null>(null);
  const [jellyfinProgress,setJellyfinProgress]=useState<JellyfinPrepareProgress|null>(null);
  const [status,setStatus]=useState<StatusMap>({});
  const [updates,setUpdates]=useState<UpdateMap>({});
  const [busy,setBusy]=useState(false);
  const [refreshing,setRefreshing]=useState(false);
  const [confirm,setConfirm]=useState<{app:CatalogApp;kind:Action}|null>(null);
  const [log,setLog]=useState('');
  const [notice,setNotice]=useState('');
  const [favorites,setFavorites]=useState<string[]>(loadSaved);
  const [managedApps,setManagedApps]=useState<string[]>(()=>loadManagedAppIds(globalThis.localStorage));
  const [tasks,setTasks]=useState<TaskRecord[]>(loadTasks);
  const searchRef=useRef<HTMLInputElement>(null);
  const connected=Boolean(window.easyopen);
  const nativeWindows=connected && machine?.platform==='win32';
  const targetPlatform=desktopPlatform(machine?.platform);
  const statusesReady=connected && machine!==null;
  const totals=useMemo(()=>catalogSummary(apps,status,updates,managedApps,targetPlatform),[status,updates,managedApps,targetPlatform]);
  const categories=useMemo(()=>['전체',...new Set(apps.filter(a=>a.os.includes(targetPlatform)).map(a=>a.category))],[targetPlatform]);
  const visible=useMemo(()=>visibleApps(apps,page,query,category,status,favorites,updates,managedApps,targetPlatform),[page,query,category,status,favorites,updates,managedApps,targetPlatform]);
  const homeRecent=useMemo(()=>{
    const supported=apps.filter(a=>a.os.includes(targetPlatform));
    const installed=supported.filter(a=>status[a.id]==='installed');
    return installed.length?installed.slice(0,4):supported.filter(a=>['jellyfin','cosyvoice','localsend','obs-studio'].includes(a.id)).slice(0,4);
  },[status,targetPlatform]);

  useEffect(()=>{localStorage.setItem('easyopen-favorites',JSON.stringify(favorites));},[favorites]);
  useEffect(()=>{localStorage.setItem('easyopen-managed-apps',JSON.stringify(managedApps));},[managedApps]);
  useEffect(()=>{localStorage.setItem('easyopen-tasks',JSON.stringify(tasks.slice(0,50)));},[tasks]);
  useEffect(()=>window.easyopen?.onRuntimeLog(message=>setRuntimeLog(previous=>(previous+'\n'+message).slice(-6000))),[]);
  useEffect(()=>window.easyopen?.onContainerInstallProgress((id,value)=>setTasks(previous=>previous.map(task=>task.appId===id&&task.state==='running'?{...task,message:value.message,progress:value.percent,stage:value.stage}:task))),[]);
  useEffect(()=>window.easyopen?.onJellyfinPrepareProgress(value=>setJellyfinProgress(value)),[]);
  useEffect(()=>window.easyopen?.onAppUpdate(value=>setAppUpdate(value)),[]);
  useEffect(()=>{
    const handleShortcut=(event:KeyboardEvent)=>{
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();setPage('discover');searchRef.current?.focus();
      }
      if(event.key==='Escape'){setSelected(null);setConfirm(null);}
    };
    window.addEventListener('keydown',handleShortcut);
    return ()=>window.removeEventListener('keydown',handleShortcut);
  },[]);

  async function refresh(){
    if(!window.easyopen){setNotice('웹 미리보기에서는 실제 설치 상태를 확인할 수 없어요. Electron 앱에서 실행해 주세요.');return;}
    if(refreshing)return;
    setRefreshing(true);
    try{
      const machineResult=await window.easyopen.machine();
      setMachine(machineResult);
      setAppUpdate(await window.easyopen.appUpdateStatus());
      setRuntime(await window.easyopen.runtimeStatus());
      setContainers(await window.easyopen.containers());
      setCosyvoiceContainer(await window.easyopen.containerAppStatus('cosyvoice'));
      setJellyfin(await window.easyopen.jellyfinStatus());
      const connection=await window.easyopen.jellyfinConnection();
      setJellyfinLanUrl(connection.lanUrl);
      setJellyfinQr(connection.lanUrl?await QRCode.toDataURL(connection.lanUrl,{errorCorrectionLevel:'M',margin:2,width:220}):null);
      const readiness=await window.easyopen.cosyvoiceReadiness();
      setCosyvoiceReadiness(readiness);
      const results=await Promise.allSettled(apps.map(a=>window.easyopen!.status(a.id)));
      const nextStatus=Object.fromEntries(apps.map((a,i)=>[a.id,results[i].status==='fulfilled'?results[i].value:'unknown'])) as StatusMap;
      setStatus(nextStatus);
      const updateResults=await Promise.allSettled(apps.map(a=>nextStatus[a.id]==='installed'&&canTryWinget(a)?window.easyopen!.updateStatus(a.id):Promise.resolve('unknown' as const)));
      setUpdates(Object.fromEntries(apps.map((a,i)=>[a.id,updateResults[i].status==='fulfilled'?updateResults[i].value:'unknown'])));
      if(results.some(r=>r.status==='rejected'))setNotice('일부 프로그램의 설치 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }catch(e){setNotice(e instanceof Error?e.message:'PC 정보를 불러오지 못했어요.');}
    finally{setRefreshing(false);}
  }
  useEffect(()=>{void refresh();const off=window.easyopen?.onLog((_id,line)=>setLog(p=>(p+'\n'+line).slice(-7000)));return off;},[]);

  function changePage(next:Page){setPage(next);setCategory('전체');setQuery('');setSelected(null);}
  function openApp(app:CatalogApp){setSelected(app);setAdvanced(false);setLog('');}
  function saveApp(app:CatalogApp){setFavorites(p=>p.includes(app.id)?p.filter(id=>id!==app.id):[...p,app.id]);}
  function primaryLabelFor(app:CatalogApp){
    if(app.id==='jellyfin'&&['darwin','win32'].includes(machine?.platform??''))return jellyfin?.running?'Jellyfin 열기':jellyfin?.installed?'다시 사용하기':'컨테이너 테스트 시작';
    if(app.id==='cosyvoice'&&nativeWindows)return cosyvoiceContainer?.updateAvailable?'업데이트':containers.some(c=>c.name==='easyopen-cosyvoice'&&c.state==='running')?'열기':containers.some(c=>c.name==='easyopen-cosyvoice')?'관리':cosyvoiceContainer?.available?'설치':'준비 중';
    if(status[app.id]==='installed'&&canTryWinget(app)&&!managedApps.includes(app.id))return 'WinGet으로 업데이트';
    return undefined;
  }
  async function openOfficial(app:CatalogApp){
    try{
      if(window.easyopen){const ok=await window.easyopen.official(app.id);if(!ok)throw new Error('공식 사이트 링크를 열지 못했어요.');}
      else window.open(app.officialUrl,'_blank','noopener,noreferrer');
    }catch(e){setNotice(e instanceof Error?e.message:'공식 링크를 열지 못했어요.');}
  }
  function actOn(app:CatalogApp){
    if(app.id==='jellyfin'&&['darwin','win32'].includes(machine?.platform??'')){void useJellyfin(app);return;}
    if(app.id==='cosyvoice'&&nativeWindows){void useCosyVoice();return;}
    if(nativeWindows && canTryWinget(app))setConfirm({app,kind:status[app.id]==='installed'?'update':'install'});
    else void openOfficial(app);
  }
  async function useJellyfin(app:CatalogApp){
    if(!window.easyopen||busy)return;
    if(needsContainerRuntime('jellyfin',runtime)){changePage('runtime');setNotice('Jellyfin을 테스트하려면 먼저 실행 환경을 준비해 주세요.');return;}
    setBusy(true);setNotice('');setJellyfinProgress(null);
    try{
      const result=await window.easyopen.jellyfinAction(!jellyfin?.installed?'prepare':jellyfin.running?'open':'launch');
      setNotice(result.message);
      if(result.ok){if(jellyfin?.installed&&!jellyfin.running)await new Promise(resolve=>setTimeout(resolve,1200));setJellyfin(await window.easyopen.jellyfinStatus());}
    }catch(error){setNotice(error instanceof Error?error.message:'Jellyfin 작업을 완료하지 못했습니다.');}
    finally{setBusy(false);setJellyfinProgress(null);}
  }
  async function selectJellyfinMedia(){
    if(!window.easyopen)return;
    const result=await window.easyopen.selectJellyfinMediaFolder();
    if(result.ok&&result.path)setJellyfinMediaFolder(result.path);
    setNotice(result.message);
  }
  async function copyJellyfinAddress(){
    if(!window.easyopen)return;
    const result=await window.easyopen.copyJellyfinAddress();setNotice(result.message);
  }
  async function manageJellyfin(action:'forget'){
    if(!window.easyopen||busy)return;
    setBusy(true);setNotice('');
    try{const result=await window.easyopen.jellyfinAction(action);setNotice(result.message);if(result.ok)setJellyfin(await window.easyopen.jellyfinStatus());}
    catch(error){setNotice(error instanceof Error?error.message:'Jellyfin 관리 작업을 완료하지 못했습니다.');}
    finally{setBusy(false);}
  }
  async function useCosyVoice(){
    if(!window.easyopen||busy)return;
    const installed=containers.find(container=>container.name==='easyopen-cosyvoice');
    if(installed&&cosyvoiceContainer?.updateAvailable){void updateCosyVoice();return;}
    if(installed?.state==='running'){
      if(!await window.easyopen.openContainerApp('cosyvoice'))setNotice('CosyVoice 작업창을 열지 못했습니다.');
      return;
    }
    if(installed){changePage('runtime');setNotice('CosyVoice가 중지되어 있습니다. Runtime 화면에서 시작해 주세요.');return;}
    if(!cosyvoiceContainer?.available){setNotice(cosyvoiceContainer?.message??'승인된 CosyVoice 이미지가 아직 준비되지 않았습니다.');return;}
    if(needsContainerRuntime('cosyvoice',runtime)){changePage('runtime');setNotice('CosyVoice를 사용하려면 먼저 Runtime 준비를 완료해 주세요.');return;}
    const taskId=`${Date.now()}-cosyvoice-install`;
    const task:TaskRecord={id:taskId,appId:'cosyvoice',appName:'CosyVoice',action:'install',state:'running',message:'컨테이너 설치를 시작했습니다.',createdAt:new Date().toISOString(),progress:0};
    setTasks(previous=>[task,...previous].slice(0,50));
    setBusy(true);setRuntimeLog('');setNotice('');
    try{
      const result=await window.easyopen.installContainerApp('cosyvoice');
      const state:TaskRecord['state']=result.ok?'success':result.message==='사용자가 취소했습니다.'?'cancelled':'failed';
      setTasks(previous=>previous.map(task=>task.id===taskId?{...task,state,message:result.message,progress:result.ok?100:task.progress}:task));
      if(result.ok){const opened=await window.easyopen.openContainerApp('cosyvoice');setNotice(opened?'CosyVoice 설치를 마치고 EasyOpen 작업창을 열었습니다.':'CosyVoice 설치는 완료됐지만 작업창을 열지 못했습니다. 다시 ‘열기’를 눌러 주세요.');}
      else setNotice(result.message);
      await refresh();
    }catch(error){const message=error instanceof Error?error.message:'CosyVoice 설치를 완료하지 못했습니다.';setTasks(previous=>previous.map(task=>task.id===taskId?{...task,state:'failed',message}:task));setNotice(message);}
    finally{setBusy(false);}
  }
  async function updateCosyVoice(){
    if(!window.easyopen||busy)return;
    const taskId=`${Date.now()}-cosyvoice-update`;
    const task:TaskRecord={id:taskId,appId:'cosyvoice',appName:'CosyVoice',action:'update',state:'running',message:'새 CosyVoice 이미지 업데이트를 시작했습니다.',createdAt:new Date().toISOString(),progress:0};
    setTasks(previous=>[task,...previous].slice(0,50));setBusy(true);setRuntimeLog('');setNotice('');
    try{
      const result=await window.easyopen.updateContainerApp('cosyvoice');
      const state:TaskRecord['state']=result.ok?'success':result.message==='사용자가 취소했습니다.'?'cancelled':'failed';
      setTasks(previous=>previous.map(value=>value.id===taskId?{...value,state,message:result.message,progress:result.ok?100:value.progress}:value));
      setNotice(result.message);await refresh();
      if(result.ok&&!await window.easyopen.openContainerApp('cosyvoice'))setNotice(`${result.message} 작업창은 다시 ‘열기’를 눌러 주세요.`);
    }catch(error){const message=error instanceof Error?error.message:'CosyVoice 업데이트를 완료하지 못했습니다.';setTasks(previous=>previous.map(value=>value.id===taskId?{...value,state:'failed',message}:value));setNotice(message);}
    finally{setBusy(false);}
  }
  async function cancelCosyVoiceInstall(){
    if(!window.easyopen)return;
    const result=await window.easyopen.cancelContainerInstall('cosyvoice');setNotice(result.message);
  }
  async function confirmAction(){
    if(!confirm||busy)return;
    const {app,kind}=confirm;
    const taskId=`${Date.now()}-${app.id}-${kind}`;
    const task:TaskRecord={id:taskId,appId:app.id,appName:app.name,action:kind,state:'running',message:'작업을 시작했습니다.',createdAt:new Date().toISOString()};
    setTasks(previous=>[task,...previous].slice(0,50));
    setConfirm(null);setBusy(true);setLog('작업을 시작합니다…');setNotice('');
    try{
      if(!window.easyopen)throw new Error('설치 관리는 Electron 앱에서만 가능해요.');
      const result=await window.easyopen.action(app.id,kind);
      const nextState:TaskRecord['state']=result.ok?'success':result.message==='사용자가 취소했습니다.'?'cancelled':'failed';
      setTasks(previous=>previous.map(task=>task.id===taskId?{...task,state:nextState,message:result.message||'결과 메시지가 없습니다.'}:task));
      if(result.ok)setManagedApps(previous=>recordManagedAction(previous,app.id,kind,true));
      setNotice(result.ok?`${app.name} ${operations[kind]} 명령이 종료됐어요. 실제 앱 상태를 확인해 주세요.`:
        `${app.name} ${operations[kind]}: ${result.message||'작업이 완료되지 않았어요.'}`);
      await refresh();
    }catch(e){const message=e instanceof Error?e.message:'작업을 진행하지 못했어요.';setTasks(previous=>previous.map(task=>task.id===taskId?{...task,state:'failed',message}:task));setNotice(message);}
    finally{setBusy(false);}
  }

  async function prepareRuntime(action:'install-wsl'|'install-docker'|'start-docker'){
    if(!window.easyopen||runtimeBusy)return;
    setRuntimeBusy(true);setRuntimeLog('');setNotice('');
    try{const result=await window.easyopen.runtimeAction(action);setNotice(result.message);setRuntime(await window.easyopen.runtimeStatus());}
    catch(error){setNotice(error instanceof Error?error.message:'Runtime 작업을 완료하지 못했습니다.');}
    finally{setRuntimeBusy(false);}
  }
  async function handleAppUpdate(){
    if(!window.easyopen||!appUpdate)return;
    try{
      if(appUpdate.state==='downloaded'){await window.easyopen.installAppUpdate();return;}
      const next=appUpdate.state==='available'?await window.easyopen.downloadAppUpdate():await window.easyopen.checkAppUpdate();
      setAppUpdate(next);setNotice(next.message);
    }catch(error){setNotice(error instanceof Error?error.message:'EasyOpen 업데이트 작업을 완료하지 못했습니다.');}
  }
  async function refreshRuntime(){
    if(!window.easyopen||runtimeChecking)return;
    setRuntimeChecking(true);setNotice('');
    try{
      const [nextRuntime,nextContainers]=await Promise.all([window.easyopen.runtimeStatus(),window.easyopen.containers()]);
      setRuntime(nextRuntime);setContainers(nextContainers);
      if(!nextRuntime.dockerInstalled)setNotice(machine?.platform==='darwin'?'Applications에서 Docker Desktop을 찾지 못했습니다. 공식 Docker Desktop을 설치한 뒤 다시 확인해 주세요.':'Docker Desktop을 찾지 못했습니다. 설치한 뒤 다시 확인해 주세요.');
      else if(!nextRuntime.dockerRunning)setNotice('Docker Desktop은 설치되어 있지만 Container Engine이 아직 실행되지 않았습니다. Docker Desktop을 시작한 뒤 다시 확인해 주세요.');
    }catch(error){setNotice(error instanceof Error?error.message:'Container Engine 상태를 확인하지 못했습니다.');}
    finally{setRuntimeChecking(false);}
  }
  async function manageContainer(action:'start'|'stop'|'restart'|'remove',container:ManagedContainer){
    if(!window.easyopen||busy)return;setBusy(true);setNotice('');
    try{const result=await window.easyopen.containerAction(action,container.name);setNotice(result.message);setContainers(await window.easyopen.containers());}
    catch(error){setNotice(error instanceof Error?error.message:'컨테이너 작업을 완료하지 못했습니다.');}
    finally{setBusy(false);}
  }
  async function showContainerLogs(container:ManagedContainer){if(!window.easyopen)return;setRuntimeLog(await window.easyopen.containerLogs(container.name));}

  const runtimePlatformSupported=connected&&['win32','darwin'].includes(machine?.platform??'');
  const runtimeRequired=Boolean(runtimePlatformSupported&&(!runtime||!runtime.dockerInstalled||!runtime.dockerRunning||(machine?.platform==='win32'&&!runtime.wslInstalled)));
  const runtimeStatusText=runtimeChecking?'Container Engine 확인 중…':!runtime?'아직 상태를 확인하지 못했습니다.':!runtime.dockerInstalled?'Docker Desktop을 찾지 못했습니다.':!runtime.dockerRunning?'Docker Desktop 설치됨 · Engine 실행 필요':`실행 중 · ${runtime.dockerVersion??'버전 확인됨'}`;
  const runtimeSetup=<section className="runtime-card"><span className="runtime-logo"><Package size={30}/></span><span className="micro-label">EASYOPEN RUNTIME</span><h2>컨테이너 실행 환경을 준비할게요</h2><p>Jellyfin 같은 컨테이너 앱을 설치하고 실행하려면 Docker Desktop의 Container Engine이 필요해요.</p>
    {notice&&<div className="alert-inline" role="status"><CircleAlert size={17}/><span>{notice}</span></div>}
    <div className="runtime-steps">{machine?.platform==='win32'&&<article className={runtime?.wslInstalled?'is-ready':''}><span>{runtime?.wslInstalled?<Check size={18}/>:<span>1</span>}</span><div><strong>WSL2</strong><p>{runtime?.wslInstalled?'설치됨':'Windows 기능 설치와 재부팅이 필요할 수 있어요.'}</p></div>{!runtime?.wslInstalled&&<button onClick={()=>void prepareRuntime('install-wsl')} disabled={runtimeBusy}>설치</button>}</article>}
    <article className={runtime?.dockerInstalled?'is-ready':''}><span>{runtime?.dockerInstalled?<Check size={18}/>:<span>{machine?.platform==='win32'?'2':'1'}</span>}</span><div><strong>Docker Desktop</strong><p>{runtime?.dockerInstalled?'설치됨':machine?.platform==='darwin'?'공식 Docker Desktop을 Applications에 설치해 주세요.':'Docker 이용약관과 조직별 이용 조건을 확인해야 해요.'}</p></div>{machine?.platform==='win32'&&runtime?.wslInstalled&&!runtime?.dockerInstalled&&<button onClick={()=>void prepareRuntime('install-docker')} disabled={runtimeBusy}>설치</button>}</article>
    <article className={runtime?.dockerRunning?'is-ready':''}><span>{runtime?.dockerRunning?<Check size={18}/>:<span>{machine?.platform==='win32'?'3':'2'}</span>}</span><div><strong>Container Engine</strong><p>{runtimeStatusText}</p></div>{runtime?.dockerInstalled&&!runtime?.dockerRunning&&<button onClick={()=>void prepareRuntime('start-docker')} disabled={runtimeBusy}>시작</button>}</article></div>
    <div className="runtime-actions"><button className="save-button" onClick={()=>void refreshRuntime()} disabled={runtimeBusy||runtimeChecking}><RefreshCw size={16} className={runtimeChecking?'spinning':''}/> 다시 확인</button></div>{(runtimeBusy||runtimeChecking)&&<p className="runtime-progress"><LoaderCircle size={16} className="spinning"/> {runtimeBusy?'Runtime 작업을 진행하고 있어요…':'Container Engine 상태를 확인하고 있어요…'}</p>}{runtimeLog&&<pre className="log-view">{runtimeLog}</pre>}<p className="runtime-legal">Docker Desktop의 이용 조건은 사용자·조직 유형에 따라 다를 수 있습니다. EasyOpen은 이용약관 동의를 대신하지 않습니다.</p></section>;

  const catalogView=!['home','tasks','runtime'].includes(page);
  const showListTitle=page==='discover'?'전체 프로그램':page==='installed'?'설치 감지된 프로그램':page==='updates'?'업데이트 수동 점검 대상':'저장한 프로그램';
  return <div className="eo-shell">
    <aside className="eo-sidebar" aria-label="EasyOpen 기본 메뉴">
      <button className="brand-lockup" onClick={()=>changePage('home')} aria-label="EasyOpen 홈으로">
        <span className="logo-box"><Package size={21} strokeWidth={2}/></span>
        <span className="brand-title">EasyOpen<small>by MANO</small></span>
      </button>
      <div className="sidebar-caption">WORKSPACE</div>
      <nav className="primary-nav" aria-label="주 메뉴">
        {navigation.map(({page:id,label,icon:Icon})=><button key={id} className={`nav-link ${page===id?'is-selected':''}`} onClick={()=>changePage(id)} aria-current={page===id?'page':undefined}>
          <Icon size={18} strokeWidth={1.9}/><span>{label}</span>
          {id==='updates'&&totals.updateAvailableCount>0&&<span className="nav-number" title="업데이트 가능">{totals.updateAvailableCount}</span>}
          {id==='library'&&favorites.length>0&&<span className="nav-number">{favorites.length}</span>}
        </button>)}
      </nav>
      <div className="sidebar-spacer"/>
      <div className="sidebar-device"><span className="device-circle"><Monitor size={17}/></span><span><strong>이 기기</strong><small>{machine?.platform==='win32'?'Windows':machine?.platform==='darwin'?'macOS':machine?.platform??'기기 정보 확인 전'}</small></span><span className="live-dot" aria-hidden="true"/></div>
      <div className="sidebar-foot"><ShieldCheck size={14}/> 공식 출처를 우선합니다 <span>v0.1 beta</span></div>
    </aside>

    <div className="eo-workspace">
      <header className="eo-topbar"><div className="top-crumb">EasyOpen <ChevronRight size={14}/> <strong>{pageLabels[page]}</strong></div>
        <div className="top-tools">{appUpdate&&appUpdate.state!=='disabled'&&<button className={`app-update-button update-${appUpdate.state}`} onClick={()=>void handleAppUpdate()} disabled={appUpdate.state==='checking'||appUpdate.state==='downloading'} title={appUpdate.message}>{appUpdate.state==='available'?`업데이트 ${appUpdate.availableVersion}`:appUpdate.state==='downloading'?`${appUpdate.percent??0}%`:appUpdate.state==='downloaded'?'재시작해 업데이트':'앱 업데이트'} </button>}<Readiness machine={machine} connected={connected}/><button className="icon-button" onClick={()=>void refresh()} disabled={refreshing} title="설치 상태 새로고침" aria-label="설치 상태 새로고침"><RefreshCw size={17} className={refreshing?'spinning':''}/></button></div>
      </header>
      <main className="eo-main">
        <div className="page-head"><div><span className="micro-label">EASYOPEN DESKTOP</span><h1>{pageLabels[page]}</h1><p>{pageSubtitles[page]}</p></div>
          {page==='home'&&<button className="soft-action" onClick={()=>changePage('discover')}><Search size={16}/> 프로그램 찾기 <ArrowRight size={15}/></button>}
        </div>
        {notice&&<div className="alert-inline" role="status"><CircleAlert size={17}/><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="알림 닫기"><X size={16}/></button></div>}
        {!connected&&<div className="preview-note"><Info size={17}/><span>화면 미리보기 상태예요. 실제 프로그램 설치와 기기 정보 확인은 Electron 실행 시 이용할 수 있어요.</span></div>}
        {page==='home'&&<>
          <section className="metrics" aria-label="내 기기 현황">
            <div className="metric"><div className="metric-top"><span>설치 감지됨</span><PackageCheck size={19}/></div><strong>{statusesReady?totals.installedCount:'–'}<small>개</small></strong><p>카탈로그에서 확인한 프로그램</p></div>
            <div className="metric"><div className="metric-top"><span>업데이트 가능</span><RefreshCw size={19}/></div><strong>{statusesReady?totals.updateAvailableCount:'–'}<small>개</small></strong><p>{totals.updateUnknownCount?`${totals.updateUnknownCount}개 확인 실패`:'WinGet 조회 결과'}</p></div>
            <div className="metric"><div className="metric-top"><span>확인되지 않은 상태</span><Activity size={19}/></div><strong>{statusesReady?totals.unknownCount:'–'}<small>개</small></strong><p>WinGet 및 환경에 따라 다름</p></div>
          </section>
          <div className="section-heading"><div><h2>{totals.installedCount?'내 프로그램':'시작하기 좋은 프로그램'}</h2><p>{totals.installedCount?'설치 상태를 확인하고 관리해 보세요.':'원하는 앱을 살펴보고 공식 출처로 이동할 수 있어요.'}</p></div><button className="inline-action" onClick={()=>changePage(totals.installedCount?'installed':'discover')}>전체 보기 <ArrowRight size={15}/></button></div>
          <section className="program-list" aria-label="추천 및 설치 프로그램">
            <div className="list-head"><span>프로그램</span><span>분류</span><span>설치 상태</span><span>작업</span></div>
            {homeRecent.map(a=><ProgramRow key={a.id} app={a} state={status[a.id]??'unknown'} connected={connected} managed={managedApps.includes(a.id)} nativeWindows={Boolean(nativeWindows)} primaryLabel={primaryLabelFor(a)} onDetails={()=>openApp(a)} onPrimary={()=>actOn(a)}/>)}
          </section>
          <section className="home-feature" aria-labelledby="quickstart-title"><div className="feature-illustration"><div className="feature-ring"><Mic2 size={33}/></div><span className="feature-mini"><Sparkles size={15}/></span></div>
            <div className="feature-body"><span className="feature-overline">EASYOPEN PICK · CONTAINER APP</span><h2 id="quickstart-title">CosyVoice를 시작해 볼까요?</h2><p>PC 준비 상태를 확인하고, 승인된 이미지가 등록되면 EasyOpen에서 설치부터 로컬 Web UI 실행까지 관리할 수 있어요.</p><button className="feature-link" onClick={()=>{const found=apps.find(a=>a.id==='cosyvoice');if(found)openApp(found);}}>준비 상태 보기 <ArrowRight size={16}/></button></div>
          </section>
          <div className="home-bottom"><div><CircleHelp size={18}/><div><strong>처음 사용하시나요?</strong><p>프로그램의 공식 출처와 요구 사양을 먼저 확인해 주세요.</p></div></div><button className="inline-action" onClick={()=>{const a=apps.find(x=>x.id==='localsend')??apps[0];openApp(a)}}>가이드 열기 <ChevronRight size={15}/></button></div>
        </>}
        {page==='tasks'&&<section className="task-center" aria-label="작업 기록">{tasks.length?<>{tasks.map(task=><article className={`task-record task-${task.state}`} key={task.id}><span className="task-state">{task.state==='running'?'진행 중':task.state==='success'?'완료':task.state==='cancelled'?'취소됨':'실패'}</span><div className="task-content"><strong>{task.appName} · {operations[task.action]}</strong><p>{task.message}</p>{typeof task.progress==='number'&&<div className="task-progress" aria-label={`단계 진행률 ${task.progress}%`}><span style={{width:`${task.progress}%`}}/></div>}<div className="task-meta"><small>{new Date(task.createdAt).toLocaleString('ko-KR')}{typeof task.progress==='number'?` · 단계 진행률 ${task.progress}%`:''}</small><span>{task.appId==='cosyvoice'&&task.state==='running'?<button onClick={()=>void cancelCosyVoiceInstall()}>설치 취소</button>:task.appId==='cosyvoice'&&(task.state==='failed'||task.state==='cancelled')?<button onClick={()=>void useCosyVoice()} disabled={busy}>다시 시도</button>:null}</span></div></div></article>)}<button className="soft-action" onClick={()=>setTasks([])} disabled={tasks.some(task=>task.state==='running')}>기록 지우기</button></>:<div className="empty-state"><span className="empty-icon"><Activity size={26}/></span><h3>아직 작업 기록이 없어요</h3><p>설치·업데이트·제거를 실행하면 결과와 오류가 여기에 표시됩니다.</p></div>}</section>}
        {page==='runtime'&&(runtimeRequired?<section className="runtime-setup">{runtimeSetup}</section>:<section className="container-center"><div className="runtime-summary"><div><strong>Container Engine</strong><p>{runtimeStatusText}</p></div><button className="soft-action" onClick={()=>void refreshRuntime()} disabled={runtimeChecking}><RefreshCw size={15} className={runtimeChecking?'spinning':''}/> {runtimeChecking?'확인 중':'새로고침'}</button></div>{containers.length?containers.map(container=><article className="container-record" key={container.id}><div><span className={`container-dot ${container.state==='running'?'is-running':''}`}/><strong>{container.name}</strong><p>{container.image}</p><small>{container.status}</small></div><div className="container-actions">{container.state==='running'?<button onClick={()=>void manageContainer('stop',container)}><Square size={14}/> 중지</button>:<button onClick={()=>void manageContainer('start',container)}><Play size={14}/> 시작</button>}<button onClick={()=>void manageContainer('restart',container)}><RefreshCw size={14}/> 재시작</button><button onClick={()=>void showContainerLogs(container)}>로그</button><button className="danger" onClick={()=>void manageContainer('remove',container)}>제거</button></div></article>):<div className="empty-state"><span className="empty-icon"><HardDrive size={26}/></span><h3>관리 중인 컨테이너가 없어요</h3><p>EasyOpen으로 컨테이너 앱을 설치하면 여기에 표시됩니다.</p></div>}{runtimeLog&&<pre className="log-view">{runtimeLog}</pre>}</section>)}
        {catalogView&&<>
          {page==='updates'&&<div className="context-note"><Info size={18}/><span><strong>EasyOpen으로 설치했고 WinGet에서 새 버전이 확인된 프로그램만 표시해요.</strong> 기존에 설치되어 있던 앱은 여기 넣지 않습니다.</span></div>}
          {page==='installed'&&<div className="context-note"><Info size={18}/><span><strong>EasyOpen 관리</strong>와 <strong>이 PC에서 발견</strong>을 구분해 표시해요. 기존 앱은 사용자가 명시적으로 선택할 때만 WinGet 작업을 실행합니다.</span></div>}
          {page==='discover'&&<div className="catalog-intro"><span className="intro-mark"><WandSparkles size={18}/></span><div><strong>하고 싶은 작업부터 찾아보세요</strong><p>필요한 앱을 찾으면 설치 환경, 사용법, 라이선스를 한 곳에서 확인할 수 있어요.</p></div><span className="intro-total">{totals.catalogCount}개 프로그램</span></div>}
          <div className="catalog-controls"><div className="catalog-search"><Search size={18}/><input ref={searchRef} placeholder="프로그램 이름이나 기능 검색…" aria-label="프로그램 검색" value={query} onChange={e=>setQuery(e.target.value)}/><kbd>{machine?.platform==='darwin'?'⌘ K':'Ctrl K'}</kbd></div>
            <label className="category-select"><ListFilter size={16}/><select aria-label="카테고리" value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select><ChevronDown size={14}/></label></div>
          <div className="section-heading catalog-section"><div><h2>{showListTitle}</h2><p>{visible.length}개 항목 · {page==='discover'?'공식 출처와 설치 정보를 확인하세요.':page==='updates'?'업데이트 유무는 아직 확인되지 않았어요.':'목록에 표시된 상태는 실시간 진단이 아닐 수 있어요.'}</p></div><button className="icon-button outline" onClick={()=>void refresh()} disabled={refreshing} aria-label="목록 새로고침"><RefreshCw size={17} className={refreshing?'spinning':''}/></button></div>
          <section className="program-list" aria-label={showListTitle}>
            <div className="list-head"><span>프로그램</span><span>분류</span><span>설치 상태</span><span>작업</span></div>
            {visible.map(a=><ProgramRow key={a.id} app={a} state={status[a.id]??'unknown'} connected={connected} managed={managedApps.includes(a.id)} nativeWindows={Boolean(nativeWindows)} primaryLabel={primaryLabelFor(a)} onDetails={()=>openApp(a)} onPrimary={()=>actOn(a)}/>)}
            {!visible.length&&<div className="empty-state"><span className="empty-icon">{page==='installed'?<PackageCheck size={26}/>:page==='updates'?<RefreshCw size={26}/>:page==='library'?<FolderHeart size={26}/>:<Search size={26}/>}</span><h3>{page==='installed'?'설치 감지된 프로그램이 없어요':page==='updates'?'수동 점검 대상이 없어요':page==='library'?'보관함이 비어 있어요':'검색 결과가 없어요'}</h3><p>{page==='installed'?'프로그램을 설치한 뒤 상태를 다시 확인해 주세요.':page==='updates'?'업데이트가 없다는 뜻은 아니에요. 설치 상태를 다시 확인해 보세요.':page==='library'?'관심 있는 프로그램 상세 화면에서 보관함에 저장해 보세요.':'다른 이름이나 카테고리로 검색해 보세요.'}</p><button className="soft-action" onClick={()=>changePage('discover')}>프로그램 탐색 <ArrowRight size={15}/></button></div>}
          </section>
        </>}
        <footer className="eo-footer"><span>EasyOpen · 좋은 오픈소스를 더 쉽게.</span><span>실기기 검증 전인 설치 기능은 시험 제공됩니다.</span></footer>
      </main>
    </div>

    {selected&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><aside className="detail-panel" role="dialog" aria-modal="true" aria-label={`${selected.name} 상세 정보`}>
      <div className="panel-top"><span>프로그램 정보</span><button className="icon-button" aria-label="상세 창 닫기" onClick={()=>setSelected(null)}><X size={19}/></button></div>
      <div className="panel-scroll"><div className="detail-hero"><AppIcon app={selected} size="lg"/><div><span className="detail-category">{selected.category} · 공식 오픈소스</span><h2>{selected.name}</h2><p>{selected.summary}</p></div></div>
        <div className="detail-status"><StateTag state={status[selected.id]??'unknown'} connected={connected} managed={managedApps.includes(selected.id)}/><span>{canTryWinget(selected)?'Windows WinGet 시험 연동':'공식 설치 안내 제공'}</span></div>
        <div className="panel-buttons"><button className="primary-button" onClick={()=>actOn(selected)}>{selected.id==='cosyvoice'&&nativeWindows?(cosyvoiceContainer?.updateAvailable?'CosyVoice 업데이트':containers.some(c=>c.name==='easyopen-cosyvoice'&&c.state==='running')?'EasyOpen에서 열기':containers.some(c=>c.name==='easyopen-cosyvoice')?'Runtime에서 관리':cosyvoiceContainer?.available?'설치':'이미지 준비 중'):(primaryLabelFor(selected)??getActionLabel(selected,status[selected.id]??'unknown',Boolean(nativeWindows)))}<ArrowUpRight size={16}/></button><button className={`save-button ${favorites.includes(selected.id)?'is-saved':''}`} onClick={()=>saveApp(selected)} title="보관함에 저장"><FolderHeart size={18}/>{favorites.includes(selected.id)?'저장됨':'보관함 저장'}</button></div>
        {nativeWindows&&canTryWinget(selected)&&<div className="caution"><CircleAlert size={17}/><span>{status[selected.id]==='installed'&&!managedApps.includes(selected.id)?'이 앱은 EasyOpen으로 설치하지 않았습니다. 계속하면 기존 앱을 WinGet으로 업데이트합니다.':'WinGet 설치·업데이트는 Windows 실기기에서 검증되지 않은 베타 기능이에요. 실행 전 작업 내용을 확인해 주세요.'}</span></div>}
        <div className="detail-section"><h3>설치 전 확인</h3><p>{selected.requirements}</p></div>
        {selected.id!=='jellyfin'&&<div className="detail-section"><h3>첫 사용 가이드</h3><p>{selected.guide}</p></div>}
        {selected.id==='jellyfin'&&<div className="detail-section jellyfin-guide"><div className="guide-heading"><span>처음부터 차근차근</span><h3>Jellyfin 시작 가이드</h3><p>어려운 설정은 뒤로 미루고, 아래 순서대로 한 단계씩 진행하세요.</p></div><ol>{desktopJellyfinGuide(machine?.platform??'unknown').map((step,index)=><li key={step.title}><span>{index+1}</span><div><strong>{step.title}</strong><p>{step.body}</p></div></li>)}</ol><div className="guide-trust"><ShieldCheck size={17}/><p>EasyOpen은 Jellyfin 관리자 비밀번호와 영상 파일을 수집하지 않습니다.</p></div></div>}
        {selected.id==='cosyvoice'&&<div className="detail-section"><h3>이 PC의 CosyVoice 준비 상태</h3>{cosyvoiceReadiness?<><p>{cosyvoiceReadiness.supported?'1차 설치 조건을 확인했습니다. Windows 실기기 검증 전인 시험 기능입니다.':'아직 1차 설치 조건을 모두 확인하지 못했습니다.'}</p><dl className="definition-list">{cosyvoiceReadiness.checks.map(check=><div key={check.id}><dt>{check.ok?'확인':'확인 필요'} · {check.label}</dt><dd>{check.detail}</dd></div>)}</dl><p>{cosyvoiceContainer?.message}</p><p><small>후보 기준: CosyVoice commit {cosyvoiceReadiness.candidate.commit.slice(0,7)} · {cosyvoiceReadiness.candidate.model}</small></p></>:<p>Electron 앱에서 PC 상태를 확인해 주세요.</p>}</div>}
        {selected.id==='jellyfin'&&['darwin','win32'].includes(machine?.platform??'')&&<><div className="detail-section"><h3>이 PC의 Jellyfin 상태</h3><p>{jellyfin?.message??'Jellyfin 사용 상태를 확인하고 있습니다.'}</p><dl className="definition-list"><div><dt>사용 준비</dt><dd>{jellyfin?.installed?'완료':'필요'}</dd></div><div><dt>로컬 서버</dt><dd>{jellyfin?.running?'127.0.0.1:8096 응답 확인':'응답 없음'}</dd></div></dl></div><div className="detail-section"><h3>미디어 폴더</h3><p>EasyOpen은 폴더를 선택만 하며 파일을 수정하거나 삭제하지 않습니다. 선택 후 Jellyfin 설정 화면에서 라이브러리에 추가하세요.</p><button className="link-button" onClick={()=>void selectJellyfinMedia()}>폴더 선택 <HardDrive size={15}/></button>{jellyfinMediaFolder&&<p className="selected-path">{jellyfinMediaFolder}</p>}</div><div className="detail-section"><h3>휴대폰 연결</h3>{jellyfinLanUrl?<div className="jellyfin-connect"><img src={jellyfinQr??undefined} alt="Jellyfin LAN 서버 주소 QR 코드"/><div><code>{jellyfinLanUrl}</code><p>같은 Wi-Fi의 EasyOpen 모바일에서 이 서버를 등록하세요. QR에는 계정이나 인증 토큰이 들어 있지 않습니다.</p><button className="link-button" onClick={()=>void copyJellyfinAddress()}>주소 복사</button></div></div>:<p>사설 LAN 주소를 찾지 못했습니다. Wi-Fi 연결을 확인해 주세요.</p>}</div></>}
        <div className="detail-section"><h3>프로젝트 정보</h3><dl className="definition-list"><div><dt>라이선스</dt><dd>{selected.license}</dd></div><div><dt>지원 운영체제</dt><dd>{selected.os.join(', ')}</dd></div><div><dt>설치 검증</dt><dd>{selected.install[targetPlatform]?.validated?'해당 명세에서 검증됨':'실기기 검증 전'}</dd></div></dl><button className="link-button" onClick={()=>void openOfficial(selected)}>공식 사이트 열기 <ExternalLink size={15}/></button></div>
        <button className="advanced-button" aria-expanded={advanced} onClick={()=>setAdvanced(v=>!v)}><Settings2 size={17}/> 고급 정보 및 관리 <ChevronDown size={17} className={advanced?'rotated':''}/></button>
        {advanced&&<div className="advanced-content"><dl className="definition-list"><div><dt>설치 방식</dt><dd>{selected.install[targetPlatform]?.method==='winget'?'WinGet (시험)':'공식 사이트 안내'}</dd></div><div><dt>패키지 ID</dt><dd><code>{selected.install[targetPlatform]?.packageId??'미등록'}</code></dd></div><div><dt>GPU 진단</dt><dd>{machine?.gpu??'미구현'}</dd></div><div><dt>메모리</dt><dd>{machine?`${machine.totalMemoryGb} GB`:'기기 확인 전'}</dd></div></dl>{nativeWindows&&canTryWinget(selected)&&<button className="remove-button" onClick={()=>setConfirm({app:selected,kind:'remove'})}>프로그램 제거 시도</button>}{nativeWindows&&selected.id==='jellyfin'&&jellyfin?.installed&&<button className="remove-button" onClick={()=>void manageJellyfin('forget')}>더 이상 사용하지 않기</button>}</div>}
        {log&&<div className="detail-section"><h3>작업 로그</h3><pre className="log-view">{log.slice(-4000)}</pre></div>}
      </div>
    </aside></div>}

    {confirm&&<div className="confirm-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setConfirm(null)}}><section role="alertdialog" aria-modal="true" aria-label="설치 관리 작업 확인" className="confirm-modal"><span className="modal-icon"><ShieldCheck size={25}/></span><h2>{confirm.app.name} {operations[confirm.kind]} 시도</h2><p>Windows WinGet에서 해당 작업을 실행해요. 이 기능은 아직 Windows 실기기에서 검증되지 않은 시험 기능입니다.</p><dl className="definition-list"><div><dt>패키지</dt><dd><code>{confirm.app.install.windows?.packageId}</code></dd></div><div><dt>작업</dt><dd>{operations[confirm.kind]}</dd></div></dl>{confirm.kind==='remove'&&<div className="caution"><CircleAlert size={17}/> 기존 앱의 데이터와 설정에 영향을 줄 수 있으니 백업을 확인해 주세요.</div>}<div className="modal-actions"><button className="save-button" onClick={()=>setConfirm(null)}>취소</button><button className="primary-button" onClick={()=>void confirmAction()}>{operations[confirm.kind]} 진행</button></div></section></div>}
    {busy&&<div className="work-status" role="status"><LoaderCircle size={17} className="spinning"/> {jellyfinProgress?.message??'프로그램 작업 진행 중 · 결과를 확인하는 동안 기다려 주세요.'}</div>}
  </div>;
}
