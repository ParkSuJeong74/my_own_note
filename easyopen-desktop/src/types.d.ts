export type Action='install'|'update'|'remove';
export type OperationResult={ok:boolean;code?:number|null;message:string};
export type Machine={platform:string;release:string;cpu:string;totalMemoryGb:number;freeMemoryGb:number;gpu:string;disk:string};
export interface EasyOpenBridge{
 machine():Promise<Machine>;
 status(id:string):Promise<'installed'|'not-installed'|'unknown'>;
 action(id:string,kind:Action):Promise<OperationResult>;
 official(id:string):Promise<boolean>;
 onLog(cb:(id:string,message:string)=>void):()=>void;
}
declare global{interface Window{easyopen?:EasyOpenBridge}}
export type CatalogApp={id:string;name:string;summary:string;category:string;kind:string;os:string[];officialUrl:string;sourceUrl:string;license:string;licenseStatus:string;requirements:string;guide:string;featured?:boolean;install:Record<string,{method:string;packageId?:string;storeUrl?:string;packageName?:string;validated:boolean}>};
