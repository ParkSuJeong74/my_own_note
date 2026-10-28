import test from 'node:test';
import assert from 'node:assert/strict';
import {dockerCommand} from '../electron/docker-command.ts';

test('운영체제별 Docker CLI 이름을 shell 없이 선택',()=>{
  assert.equal(dockerCommand('win32'),'docker.exe');
  assert.equal(dockerCommand('darwin'),'docker');
  assert.equal(dockerCommand('linux'),'docker');
  assert.throws(()=>dockerCommand('freebsd'),/지원하지 않는/);
});
