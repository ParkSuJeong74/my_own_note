import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

test('Cloudflare 배포 산출물은 원본 Catalog와 일치', () => {
  execFileSync(process.execPath, ['scripts/build.mjs'], {cwd: new URL('..', import.meta.url)});
  const source = JSON.parse(readFileSync(new URL('../apps.json', import.meta.url), 'utf8'));
  const deployed = JSON.parse(readFileSync(new URL('../dist/v1/apps.json', import.meta.url), 'utf8'));
  assert.deepEqual(deployed, source);
});
