import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
test('account workspace has a fixed HTTPS destination behind sender authorization',()=>{
  const main=readFileSync(new URL('../electron/main.ts',import.meta.url),'utf8');
  const start=main.indexOf("ipcMain.handle('easyopen:account-workspace'");
  const handler=main.slice(start,main.indexOf("ipcMain.handle('easyopen:official'",start));
  assert.match(handler,/authorize\(e\)/);
  assert.match(handler,/shell.openExternal\('https:\/\/easyopen-api\.mano\.io\.kr\/workspace'\)/);
  assert.doesNotMatch(handler,/id:|url:unknown/);
});
