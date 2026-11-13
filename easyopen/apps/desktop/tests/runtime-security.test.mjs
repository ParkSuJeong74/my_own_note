import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

function packageJson(relativePath) {
  return JSON.parse(read(relativePath));
}

test('Node runtimes use the November 2026 patched releases', () => {
  assert.equal(read('../../../.nvmrc').trim(), '24.22.3');

  for (const path of [
    '../../catalog/package.json',
    '../package.json',
    '../../mobile/package.json',
    '../../web/package.json',
  ]) {
    assert.equal(packageJson(path).engines.node, '>=24.22.3 <25');
  }

  const apiDockerfile = read('../../api/Dockerfile');
  assert.equal(apiDockerfile.match(/^FROM node:22\.23\.5-alpine/gm)?.length, 2);
  assert.equal(packageJson('../../api/package.json').engines.node, '>=22.23.5 <23');

  const adminDockerfile = read('../../../../mano-admin/Dockerfile');
  assert.equal(adminDockerfile.match(/^FROM node:24\.22\.3-alpine/gm)?.length, 3);
});

test('server-rendered React apps use patched Next and React releases', () => {
  const api = packageJson('../../api/package.json');
  const web = packageJson('../../web/package.json');
  const admin = packageJson('../../../../mano-admin/package.json');

  assert.equal(api.dependencies.next, '16.4.6');
  assert.equal(api.dependencies.react, '19.3.1');
  assert.equal(api.dependencies['react-dom'], '19.3.1');
  assert.equal(web.dependencies.next, '16.4.6');
  assert.equal(web.dependencies.react, '19.3.1');
  assert.equal(web.dependencies['react-dom'], '19.3.1');
  assert.equal(admin.dependencies.next, '16.4.6');
  assert.equal(admin.dependencies.react, '19.3.1');
  assert.equal(admin.dependencies['react-dom'], '19.3.1');
});
