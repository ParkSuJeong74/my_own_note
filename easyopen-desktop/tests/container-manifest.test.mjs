import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {applyContainerManifest,parseContainerManifest} from '../scripts/set-container-image.mjs';

const image=`ghcr.io/parksujeong74/easyopen-cosyvoice@sha256:${'a'.repeat(64)}`;

test('게시 워크플로의 고정 digest manifest만 허용',()=>{
  assert.deepEqual(parseContainerManifest(JSON.stringify({cosyvoice:image})),{cosyvoice:image});
  assert.throws(()=>parseContainerManifest(JSON.stringify({cosyvoice:'ghcr.io/parksujeong74/easyopen-cosyvoice:latest'})),/digest/);
  assert.throws(()=>parseContainerManifest(JSON.stringify({cosyvoice:image,command:'danger'})),/digest/);
  assert.throws(()=>parseContainerManifest(JSON.stringify({cosyvoice:`ghcr.io/other/easyopen-cosyvoice@sha256:${'a'.repeat(64)}`})),/digest/);
});

test('검증한 manifest를 정규화해 Desktop resource에 등록',()=>{
  const dir=mkdtempSync(join(tmpdir(),'easyopen-manifest-'));const source=join(dir,'input.json');const target=join(dir,'output.json');
  writeFileSync(source,JSON.stringify({cosyvoice:image}));
  assert.deepEqual(applyContainerManifest(source,target),{cosyvoice:image});
  assert.equal(readFileSync(target,'utf8'),`{\n  "cosyvoice": "${image}"\n}\n`);
});
