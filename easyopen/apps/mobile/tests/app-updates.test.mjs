import test from 'node:test';
import assert from 'node:assert/strict';
import {createAppUpdates} from '../src/app-updates.ts';
function setup(overrides={}){
  const events=[];let reloads=0;
  const port={isEnabled:true,checkForUpdateAsync:async()=>({isAvailable:true}),fetchUpdateAsync:async()=>({isNew:true}),reloadAsync:async()=>{reloads++;},...overrides};
  return {controller:createAppUpdates(port,p=>events.push(p)),events,reloads:()=>reloads};
}
test('disabled builds never query a remote update',async()=>{
  const {controller,events}=setup({isEnabled:false,checkForUpdateAsync:()=>{throw Error('unexpected');}});
  await controller.check();await controller.download();await controller.restart();
  assert.equal(controller.phase,'disabled');assert.deepEqual(events,[]);
});
test('download and restart require explicit sequential actions',async()=>{
  const s=setup();await s.controller.restart();assert.equal(s.reloads(),0);
  await s.controller.check();assert.equal(s.controller.phase,'available');assert.equal(s.reloads(),0);
  await s.controller.download();assert.equal(s.controller.phase,'ready');assert.equal(s.reloads(),0);
  await s.controller.check();assert.equal(s.controller.phase,'ready');
  await s.controller.restart();assert.equal(s.reloads(),1);
});
test('network failure stays usable and can retry',async()=>{
  let count=0;const s=setup({checkForUpdateAsync:async()=>{if(!count++)throw Error('offline');return {isAvailable:false};}});
  await s.controller.check();assert.equal(s.controller.phase,'error');
  await s.controller.check();assert.equal(s.controller.phase,'current');
});
test('concurrent checks and downloads are ignored',async()=>{
  let finish;let calls=0;
  const s=setup({checkForUpdateAsync:()=>{calls++;return new Promise(r=>{finish=r;});}});
  const pending=s.controller.check();await s.controller.check();await s.controller.download();
  assert.equal(calls,1);finish({isAvailable:true});await pending;
});
test('rollback directives also need download and restart approval',async()=>{
  const s=setup({checkForUpdateAsync:async()=>({isAvailable:false,isRollBackToEmbedded:true}),fetchUpdateAsync:async()=>({isNew:false,isRollBackToEmbedded:true})});
  await s.controller.check();await s.controller.download();assert.equal(s.controller.phase,'ready');assert.equal(s.reloads(),0);
});
test('download failure permits fresh check; failed restart keeps downloaded update',async()=>{
  const s=setup({fetchUpdateAsync:async()=>{throw Error('offline');}});
  await s.controller.check();await s.controller.download();assert.equal(s.controller.phase,'error');
  const r=setup({reloadAsync:async()=>{throw Error('busy');}});
  await r.controller.check();await r.controller.download();await r.controller.restart();assert.equal(r.controller.phase,'ready');
});
