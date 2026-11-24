const test=require('node:test');
const assert=require('node:assert/strict');
const configure=require('../app.config.js');
test('OTA disabled without explicitly configured project; fingerprint isolates native runtimes',()=>{
  const original=process.env.EASYOPEN_EAS_PROJECT_ID;
  try{
    delete process.env.EASYOPEN_EAS_PROJECT_ID;
    assert.deepEqual(configure().updates,{enabled:false});
    assert.deepEqual(configure().runtimeVersion,{policy:'fingerprint'});
    process.env.EASYOPEN_EAS_PROJECT_ID='not-a-project';
    assert.throws(configure,/UUID/);
    process.env.EASYOPEN_EAS_PROJECT_ID='00000000-0000-0000-0000-000000000001';
    const config=configure();
    assert.equal(config.updates.url,'https://u.expo.dev/00000000-0000-0000-0000-000000000001');
    assert.equal(config.updates.checkAutomatically,'NEVER');
    assert.equal(config.updates.requestHeaders['expo-channel-name'],'production');
  }finally{
    if(original===undefined)delete process.env.EASYOPEN_EAS_PROJECT_ID;else process.env.EASYOPEN_EAS_PROJECT_ID=original;
  }
});
