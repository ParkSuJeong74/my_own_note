export type Action='install'|'update'|'remove';
export type OperationResult={ok:boolean;code?:number|null;message:string};
export type RuntimeStatus={wslInstalled:boolean;dockerInstalled:boolean;dockerRunning:boolean;dockerVersion:string|null};
export type ManagedContainer={id:string;name:string;image:string;status:string;state:string};
export type ContainerAppStatus={available:boolean;message:string};
export type ContainerInstallProgress={stage:'pull'|'create'|'start'|'health'|'complete';percent:number;message:string};
export type Machine={platform:string;release:string;cpu:string;totalMemoryGb:number;freeMemoryGb:number;gpu:string;disk:string};
export type CosyVoiceReadiness={supported:boolean;platform:string;memoryGb:number;freeDiskGb:number|null;gpu:{name:string;memoryMb:number;driverVersion:string}|null;runtime:{wslInstalled:boolean;dockerInstalled:boolean;dockerRunning:boolean;dockerVersion:string|null};checks:{id:string;ok:boolean;label:string;detail:string}[];candidate:{repository:string;commit:string;model:string;modelRevision:string;python:string;webPort:number}};
export interface EasyOpenBridge{
 machine():Promise<Machine>;
 runtimeStatus():Promise<RuntimeStatus>;
 runtimeAction(action:'install-wsl'|'install-docker'|'start-docker'):Promise<OperationResult>;
 containers():Promise<ManagedContainer[]>;
 containerAction(action:'start'|'stop'|'restart'|'remove',name:string):Promise<OperationResult>;
 containerLogs(name:string):Promise<string>;
 containerAppStatus(id:string):Promise<ContainerAppStatus>;
 installContainerApp(id:string):Promise<OperationResult>;
 cancelContainerInstall(id:string):Promise<OperationResult>;
 openContainerApp(id:string):Promise<boolean>;
 cosyvoiceReadiness():Promise<CosyVoiceReadiness>;
 status(id:string):Promise<'installed'|'not-installed'|'unknown'>;
 updateStatus(id:string):Promise<'available'|'current'|'unknown'>;
 action(id:string,kind:Action):Promise<OperationResult>;
 official(id:string):Promise<boolean>;
 onLog(cb:(id:string,message:string)=>void):()=>void;
 onRuntimeLog(cb:(message:string)=>void):()=>void;
 onContainerInstallProgress(cb:(id:string,value:ContainerInstallProgress)=>void):()=>void;
}
declare global{interface Window{easyopen?:EasyOpenBridge}}
export type CatalogApp={id:string;name:string;summary:string;category:string;kind:string;os:string[];officialUrl:string;sourceUrl:string;license:string;licenseStatus:string;requirements:string;guide:string;featured?:boolean;install:Record<string,{method:string;packageId?:string;storeUrl?:string;packageName?:string;validated:boolean}>};
