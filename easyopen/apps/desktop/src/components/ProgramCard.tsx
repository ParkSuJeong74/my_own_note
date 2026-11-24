import {ArrowUpRight,FileAudio,FileText,HardDrive,Mic2,Package,Video,WandSparkles,Wifi} from 'lucide-react';
import type {CatalogApp} from '../types';
import {getActionLabel,statusText,type InstallStatus} from '../view-model';

export function AppIcon({app,size='md'}:{app:CatalogApp;size?:'md'|'lg'}){
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

export function StateTag({state,connected,managed=false}:{state:InstallStatus;connected:boolean;managed?:boolean}){
  const tone=connected && state==='installed'?'positive':connected && state==='not-installed'?'neutral':'muted';
  return <span className={`state-tag state-${tone}`}><span className="state-indicator"/>{statusText(state,connected,managed)}</span>;
}

export function ProgramRow({app,state,connected,managed,onDetails,onPrimary,nativeWindows,primaryLabel}:{
  app:CatalogApp;state:InstallStatus;connected:boolean;managed:boolean;nativeWindows:boolean;onDetails:()=>void;onPrimary:()=>void;primaryLabel?:string;
}){
  const action=primaryLabel??getActionLabel(app,state,nativeWindows);
  return <article className="program-row">
    <div className="program-card-top">
      <button type="button" className="program-identity" onClick={onDetails} aria-label={`${app.name} 상세 보기`}><AppIcon app={app}/><span className="program-copy"><strong>{app.name}</strong><small>{app.category}</small></span></button>
      <StateTag state={state} connected={connected} managed={managed}/>
    </div>
    <p className="program-description">{app.summary}</p>
    <div className="program-card-meta"><span>{managed?'내 작업 공간':'공식 오픈소스'}</span><span>{app.license}</span></div>
    <div className="row-actions"><button type="button" className="row-secondary" aria-label={app.name+' 자세히 보기'} onClick={onDetails}>살펴보기</button><button type="button" className="row-primary" aria-label={app.name+' '+action} onClick={onPrimary}>{action}<ArrowUpRight size={15}/></button></div>
  </article>;
}
