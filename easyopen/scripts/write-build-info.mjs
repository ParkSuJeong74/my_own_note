import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const [platform,output]=process.argv.slice(2);
if(!['windows','macos','android','ios'].includes(platform)||!output)throw new Error('Usage: write-build-info.mjs <windows|macos|android|ios> <output directory>');
const mobile=['android','ios'].includes(platform);
const pkg=JSON.parse(await readFile(new URL('../apps/'+(mobile?'mobile':'desktop')+'/package.json',import.meta.url),'utf8'));
const types={windows:'Windows installer (unsigned for automatic builds)',macos:'macOS DMG (unsigned and unnotarized for automatic builds)',android:'Android debug APK for automatic builds; not a Play update',ios:'Unsigned iPhone IPA; device signing is required before installation'};
const info={platform,version:pkg.version,commit:process.env.GITHUB_SHA??null,event:process.env.GITHUB_EVENT_NAME??'local',runUrl:process.env.GITHUB_RUN_ID?`${process.env.GITHUB_SERVER_URL||'https://github.com'}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`:null,description:types[platform]};
await mkdir(output,{recursive:true});await writeFile(join(output,'BUILD-INFO-'+platform+'.json'),JSON.stringify(info,null,2)+'\n');
