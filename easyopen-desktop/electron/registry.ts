import { app } from 'electron';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {CatalogApp} from './catalog-policy';
export {allowedPackage} from './catalog-policy';
export function loadCatalog():CatalogApp[]{
  const file=join(app.getAppPath(),'resources','catalog.json');
  const parsed:unknown=JSON.parse(readFileSync(file,'utf8'));
  if(!Array.isArray(parsed))throw new Error('Invalid catalog');
  return parsed as CatalogApp[];
}
