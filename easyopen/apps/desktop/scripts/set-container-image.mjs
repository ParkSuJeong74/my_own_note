import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const IMAGE=/^ghcr\.io\/parksujeong74\/easyopen-cosyvoice@sha256:[a-f0-9]{64}$/;

export function parseContainerManifest(text){
  const value=JSON.parse(text);
  if(!value||Array.isArray(value)||typeof value!=='object')throw new Error('manifest는 JSON 객체여야 합니다.');
  if(Object.keys(value).length!==1||typeof value.cosyvoice!=='string'||!IMAGE.test(value.cosyvoice))throw new Error('승인된 CosyVoice GHCR digest 형식이 아닙니다.');
  return {cosyvoice:value.cosyvoice};
}

export function applyContainerManifest(source,target){
  const manifest=parseContainerManifest(readFileSync(source,'utf8'));
  writeFileSync(target,`${JSON.stringify(manifest,null,2)}\n`,{encoding:'utf8',flag:'w'});
  return manifest;
}

export function applyContainerManifestToTargets(source,targets){
  if(!Array.isArray(targets)||targets.length<1)throw new Error('manifest 등록 대상이 없습니다.');
  const manifest=parseContainerManifest(readFileSync(source,'utf8'));
  for(const target of targets)writeFileSync(target,`${JSON.stringify(manifest,null,2)}\n`,{encoding:'utf8',flag:'w'});
  return manifest;
}

if(import.meta.url===pathToFileURL(process.argv[1]??'').href){
  const args=process.argv.slice(2);const apply=args.includes('--apply');const file=args.find(value=>value!=='--apply');
  if(!file){console.error('사용법: npm run container-image:check -- <container-images.json>\n등록: npm run container-image:set -- <container-images.json>');process.exit(2);}
  const source=resolve(file);const manifest=parseContainerManifest(readFileSync(source,'utf8'));
  if(apply)applyContainerManifestToTargets(source,[resolve('resources/container-images.json'),resolve('../catalog/container-images.json')]);
  console.log(`${apply?'registered':'verified'}: ${manifest.cosyvoice}`);
}
