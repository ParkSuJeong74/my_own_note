import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {JELLYFIN_WINDOWS_X64,jellyfinRuntimePaths} from '../electron/jellyfin-runtime.ts';
import {access,mkdir,writeFile} from 'node:fs/promises';
import {forgetManagedJellyfinRuntime,startManagedJellyfin} from '../electron/jellyfin-runtime-manager.ts';

test('관리형 Jellyfin은 셸 없이 전용 데이터 경로와 로그로 시작',async()=>{
  const root=await mkdtemp(join(tmpdir(),'easyopen-jellyfin-start-'));
  let called;
  try{
    const result=await startManagedJellyfin(root,JELLYFIN_WINDOWS_X64,(command,args,options)=>{
      called={command,args,options};
      return {pid:4242,unref(){called.unref=true;},once(event){called.event=event;}};
    });
    const paths=jellyfinRuntimePaths(root);
    assert.equal(result.pid,4242);
    assert.equal(called.command,paths.executable);
    assert.deepEqual(called.args,['-d',paths.data,'-noautorunwebapp']);
    assert.equal(called.options.detached,true);
    assert.equal(called.options.windowsHide,true);
    assert.equal(called.unref,true);
    assert.equal(called.event,'exit');
  }finally{await rm(root,{recursive:true,force:true});}
});

test('프로세스 ID를 받지 못하면 시작 성공으로 처리하지 않음',async()=>{
  const root=await mkdtemp(join(tmpdir(),'easyopen-jellyfin-start-'));
  try{
    await assert.rejects(()=>startManagedJellyfin(root,JELLYFIN_WINDOWS_X64,()=>({pid:null,unref(){},once(){}})),/프로세스 ID/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('더 이상 사용하지 않기는 Runtime만 지우고 데이터와 미디어는 건드리지 않음',async()=>{
  const root=await mkdtemp(join(tmpdir(),'easyopen-jellyfin-forget-'));
  try{
    const paths=jellyfinRuntimePaths(root);
    const media=join(root,'outside-media.mp4');
    await Promise.all([mkdir(paths.versionRoot,{recursive:true}),mkdir(paths.data,{recursive:true}),mkdir(paths.cache,{recursive:true}),mkdir(paths.logs,{recursive:true}),mkdir(join(paths.root,'downloads'),{recursive:true})]);
    await Promise.all([writeFile(join(paths.versionRoot,'runtime.bin'),'x'),writeFile(join(paths.data,'library.db'),'x'),writeFile(media,'x')]);
    await forgetManagedJellyfinRuntime(root,JELLYFIN_WINDOWS_X64);
    await assert.rejects(()=>access(paths.versionRoot));
    await assert.rejects(()=>access(join(paths.root,'downloads')));
    await Promise.all([access(paths.data),access(paths.cache),access(paths.logs),access(media)]);
  }finally{await rm(root,{recursive:true,force:true});}
});
