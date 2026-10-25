import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const input=resolve(import.meta.dirname,'../../easyopen-catalog/apps.json');
const output=resolve(import.meta.dirname,'../src/catalog.generated.json');
const catalog=JSON.parse(readFileSync(input,'utf8'));
writeFileSync(output,JSON.stringify(catalog.filter(x=>x.os.includes('android')),null,2)+'\n');
console.log(`Android catalog synchronized: ${catalog.filter(x=>x.os.includes('android')).length}`);
