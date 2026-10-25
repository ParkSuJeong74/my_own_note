import { app } from 'electron';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {validateCatalog} from './catalog-policy';
import type {CatalogApp} from './catalog-policy';
export {allowedPackage} from './catalog-policy';
export const CATALOG_URL='https://catalog.easy-open.mano.io.kr/v1/apps.json';
export function loadCatalog():CatalogApp[]{
  const file=join(app.getAppPath(),'resources','catalog.json');
  const parsed:unknown=JSON.parse(readFileSync(file,'utf8'));
  return validateCatalog(parsed);
}
export async function fetchRemoteCatalog(timeoutMs=5000):Promise<CatalogApp[]> {
  const response=await fetch(CATALOG_URL,{headers:{accept:'application/json'},signal:AbortSignal.timeout(timeoutMs)});
  if(!response.ok)throw new Error(`Catalog HTTP ${response.status}`);
  return validateCatalog(await response.json());
}
