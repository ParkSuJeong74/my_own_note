import { app } from 'electron';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
export type CatalogApp={id:string;name:string;officialUrl:string;install?:{windows?:{method:string;packageId?:string;validated:boolean}}};
export function loadCatalog():CatalogApp[]{
  const file=join(app.getAppPath(),'resources','catalog.json');
  const parsed:unknown=JSON.parse(readFileSync(file,'utf8'));
  if(!Array.isArray(parsed))throw new Error('Invalid catalog');
  return parsed as CatalogApp[];
}
export function allowedPackage(apps:CatalogApp[],id:string):string|null {
  if(typeof id!=='string'||id.length>80)return null;
  const record=apps.find(a=>a.id===id);
  const info=record?.install?.windows;
  if(info?.method!=='winget'||!info.packageId||!/^[A-Za-z0-9._-]+$/.test(info.packageId))return null;
  return info.packageId;
}
