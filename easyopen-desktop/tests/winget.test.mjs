import test from 'node:test';import assert from 'node:assert/strict';
import {buildArgs} from '../electron/winget.ts';
test('설치 명령은 고정된 패키지 ID와 no-shell 인자',()=>{
 assert.deepEqual(buildArgs('install','LocalSend.LocalSend'),['install','--id','LocalSend.LocalSend','--exact','--source','winget','--accept-package-agreements','--accept-source-agreements','--disable-interactivity']);
 assert.deepEqual(buildArgs('update','OBSProject.OBSStudio').slice(0,4),['upgrade','--id','OBSProject.OBSStudio','--exact']);
 assert.deepEqual(buildArgs('remove','HandBrake.HandBrake').slice(0,4),['uninstall','--id','HandBrake.HandBrake','--exact']);
});
test('명령 주입 가능한 입력은 거절',()=>{
 for(const id of ['app & del C:', 'abc;whoami','app && echo hi','app\nexit','app/../../x','','🪄']){
  assert.throws(()=>buildArgs('install',id));
 }
});
test('지원하지 않는 작업은 거절',()=>{
 assert.throws(()=>buildArgs('run','LocalSend.LocalSend'));
});
