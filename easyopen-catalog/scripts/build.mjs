import {cpSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'apps.json');
const output = resolve(root, 'dist');
const apps = JSON.parse(readFileSync(source, 'utf8'));

if (!Array.isArray(apps) || apps.length === 0 || apps.length > 500) {
  throw new Error('Catalog must contain between 1 and 500 apps');
}

const ids = new Set();
for (const app of apps) {
  if (!app || typeof app !== 'object' || typeof app.id !== 'string' || !/^[a-z0-9-]+$/.test(app.id)) {
    throw new Error('Every catalog app needs a safe id');
  }
  if (ids.has(app.id)) throw new Error(`Duplicate catalog id: ${app.id}`);
  ids.add(app.id);
  if (typeof app.name !== 'string' || typeof app.summary !== 'string' || typeof app.category !== 'string') {
    throw new Error(`Missing display fields: ${app.id}`);
  }
  for (const field of ['officialUrl', 'sourceUrl']) {
    const url = new URL(app[field]);
    if (url.protocol !== 'https:' || url.username || url.password) {
      throw new Error(`Invalid ${field}: ${app.id}`);
    }
  }
  if (!Array.isArray(app.os) || !app.install || typeof app.install !== 'object') {
    throw new Error(`Invalid platform fields: ${app.id}`);
  }
}

rmSync(output, {recursive: true, force: true});
mkdirSync(resolve(output, 'v1'), {recursive: true});
cpSync(source, resolve(output, 'v1/apps.json'));
writeFileSync(resolve(output, '_headers'), `/v1/*
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=300
  X-Content-Type-Options: nosniff
`);

console.log(`EasyOpen catalog built: ${apps.length} apps`);
