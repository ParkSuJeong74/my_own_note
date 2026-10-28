import assert from 'node:assert/strict';
import test from 'node:test';
import {loadManagedAppIds,recordManagedAction} from '../src/ownership.ts';

test('관리 앱 기록은 안전한 고유 ID만 복원',()=>{
  const storage={getItem:()=>JSON.stringify(['obs-studio','obs-studio','../bad',3])};
  assert.deepEqual(loadManagedAppIds(storage),['obs-studio']);
  assert.deepEqual(loadManagedAppIds({getItem:()=>'{broken'}),[]);
});

test('성공한 설치만 관리 대상으로 추가하고 성공한 제거만 해제',()=>{
  assert.deepEqual(recordManagedAction([],'obs-studio','install',true),['obs-studio']);
  assert.deepEqual(recordManagedAction([],'obs-studio','install',false),[]);
  assert.deepEqual(recordManagedAction(['obs-studio'],'obs-studio','update',true),['obs-studio']);
  assert.deepEqual(recordManagedAction(['obs-studio'],'obs-studio','remove',true),[]);
});
