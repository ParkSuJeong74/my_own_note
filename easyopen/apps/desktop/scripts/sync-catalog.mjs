import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
const source=resolve(import.meta.dirname,'../../catalog/apps.json');
const target=resolve(import.meta.dirname,'../resources/catalog.json');
const data=JSON.parse(readFileSync(source,'utf8'));
if(!Array.isArray(data)||!data.length||new Set(data.map(x=>x.id)).size!==data.length){throw new Error('카탈로그 ID 오류');}
mkdirSync(dirname(target),{recursive:true});
writeFileSync(target,JSON.stringify(data,null,2)+'\n');
console.log(`catalog synchronized: ${data.length} apps`);
