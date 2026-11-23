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

