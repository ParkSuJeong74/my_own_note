import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {installContainerApp, waitForHealth} from '../apps/desktop/electron/container-installer.ts';
import {jellyfinContainerSpec} from '../apps/desktop/electron/container-apps.ts';
import {runManagedContainerAction} from '../apps/desktop/electron/container-manager.ts';
import {probeJellyfin} from '../apps/desktop/electron/jellyfin-container-status.ts';
import {dockerCommand} from '../apps/desktop/electron/docker-command.ts';

if (process.env.EASYOPEN_DOCKER_QA !== '1') throw new Error('Set EASYOPEN_DOCKER_QA=1 to create isolated temporary QA resources.');
const exec = promisify(execFile);
const docker = dockerCommand();
const runner = async (args, timeout = 120000, signal) => {
  const actual = args[0] === 'pull' ? ['image', 'inspect', args[1]] : args;
  const result = await exec(docker, actual, {timeout, signal, maxBuffer: 4 * 1024 * 1024});
  return result.stdout.trim();
};
const absent = async args => {
  try { await runner(args); return false; } catch { return true; }
};
const runId = 'qa-' + Date.now();
const name = 'easyopen-jellyfin-' + runId;
const volumes = ['config', 'cache'].map(kind => ({name: name + '-' + kind, mount: '/' + kind}));
const media = await mkdtemp(join(tmpdir(), 'easyopen-media-'));
const original = join(media, 'original.txt');
await writeFile(original, 'original-media-unchanged');
const listener = createServer();
await new Promise((resolve, reject) => {listener.once('error', reject); listener.listen(0, '127.0.0.1', resolve);});
const port = listener.address().port;
await new Promise(resolve => listener.close(resolve));
const images = JSON.parse(await readFile(new URL('../apps/catalog/container-images.json', import.meta.url), 'utf8'));
const base = jellyfinContainerSpec(images.jellyfin, media);
const spec = {...base, id: runId, containerName: name, networkScope: 'loopback', volumes, ports: [{host: port, container: 8096}], healthUrl: 'http://127.0.0.1:' + port + '/System/Info/Public'};
const createdVolumes = [];
try {
  console.log('Docker Engine ' + await runner(['version', '--format', '{{.Server.Version}}']));
  await runner(['image', 'inspect', spec.image]);
  assert.equal(await absent(['container', 'inspect', name]), true);
  for (const volume of volumes) {
    assert.equal(await absent(['volume', 'inspect', volume.name]), true);
    await runner(['volume', 'create', '--label', 'kr.io.mano.easyopen.qa=' + runId, volume.name]);
    createdVolumes.push(volume.name);
  }
  const installed = await installContainerApp(spec, runner, url => waitForHealth(url, 90, 1000), message => console.log(message));
  assert.equal(installed.ok, true, installed.message);
  let ready = false;
  for (let attempt = 0; attempt < 90 && !ready; attempt++) {
    ready = await probeJellyfin((_url, options) => fetch(spec.healthUrl, options));
    if (!ready) await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.equal(ready, true, 'Jellyfin public identity must be ready');
  const mounts = JSON.parse(await runner(['inspect', '--format', '{{json .Mounts}}', name]));
  assert.equal(mounts.find(mount => mount.Destination === '/media').RW, false);
  await assert.rejects(() => runner(['exec', name, 'sh', '-c', 'echo altered > /media/original.txt']));
  await runner(['exec', name, 'sh', '-c', 'printf preserved > /config/qa-marker; printf cached > /cache/qa-marker']);
  assert.equal((await runManagedContainerAction('stop', name, runner)).ok, true);
  assert.equal(await runner(['inspect', '--format', '{{.State.Status}}', name]), 'exited');
  assert.equal((await runManagedContainerAction('start', name, runner)).ok, true);
  assert.equal(await waitForHealth(spec.healthUrl, 90, 1000), true);
  assert.equal((await runManagedContainerAction('restart', name, runner)).ok, true);
  assert.equal(await waitForHealth(spec.healthUrl, 90, 1000), true);
  assert.equal((await runManagedContainerAction('remove', name, runner)).ok, true);
  assert.equal(await absent(['container', 'inspect', name]), true);
  for (const [index, volume] of volumes.entries()) {
    await runner(['volume', 'inspect', volume.name]);
    const marker = await runner(['run', '--rm', '--network', 'none', '--entrypoint', '/bin/sh', '--volume', volume.name + ':/qa:ro', spec.image, '-c', 'cat /qa/qa-marker']);
    assert.equal(marker, index === 0 ? 'preserved' : 'cached');
  }
  assert.equal(await readFile(original, 'utf8'), 'original-media-unchanged');
  console.log('PASS: cached digest install, real health, read-only media, stop/start/restart, graceful removal and retained config/cache/media.');
} finally {
  if (!await absent(['container', 'inspect', name])) {
    const labels = JSON.parse(await runner(['inspect', '--format', '{{json .Config.Labels}}', name]));
    if (labels['kr.io.mano.easyopen.app-id'] !== runId) throw new Error('Refusing to clean up an unowned container');
    await runner(['rm', '--force', name]);
  }
  for (const volume of createdVolumes) {
    const labels = JSON.parse(await runner(['volume', 'inspect', '--format', '{{json .Labels}}', volume]));
    if (labels['kr.io.mano.easyopen.qa'] !== runId) throw new Error('Refusing to clean up an unowned volume');
    await runner(['volume', 'rm', volume]);
  }
  await rm(media, {recursive: true, force: true});
}
