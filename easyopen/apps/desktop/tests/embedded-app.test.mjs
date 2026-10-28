import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyManagedNavigation,managedAppOrigin} from '../electron/embedded-app.ts';

test('관리 Web UI는 명시적인 127.0.0.1 포트만 허용',()=>{
  assert.equal(managedAppOrigin('http://127.0.0.1:50000/'),'http://127.0.0.1:50000');
  for(const value of ['http://localhost:50000','http://0.0.0.0:50000','https://127.0.0.1:50000','http://127.0.0.1']){
    assert.throws(()=>managedAppOrigin(value));
  }
});

test('같은 local origin만 내부에 두고 외부 HTTPS만 브라우저로 분리',()=>{
  const origin='http://127.0.0.1:50000';
  assert.equal(classifyManagedNavigation(`${origin}/?tab=tts`,origin),'internal');
  assert.equal(classifyManagedNavigation('https://github.com/FunAudioLLM/CosyVoice',origin),'external');
  assert.equal(classifyManagedNavigation('http://example.com',origin),'deny');
  assert.equal(classifyManagedNavigation('file:///etc/passwd',origin),'deny');
  assert.equal(classifyManagedNavigation('javascript:alert(1)',origin),'deny');
  assert.equal(classifyManagedNavigation('http://user:pass@127.0.0.1:50000',origin),'deny');
});
