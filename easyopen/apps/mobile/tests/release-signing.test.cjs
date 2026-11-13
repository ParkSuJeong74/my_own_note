const test = require('node:test');
const assert = require('node:assert/strict');
const {addReleaseSigning} = require('../plugins/with-release-signing');
const fs = require('node:fs');
const path = require('node:path');

const template = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
            minifyEnabled false
        }
    }
}`;

test('release 빌드는 CI 환경 변수로 전달된 키스토어를 사용', () => {
  const result = addReleaseSigning(template);
  assert.match(result, /def easyOpenKeystorePath = System\.getenv\("EASYOPEN_KEYSTORE_PATH"\)/);
  assert.match(result, /if \(easyOpenKeystorePath != null\)/);
  assert.match(result, /storeFile file\(easyOpenKeystorePath\)/);
  assert.match(result, /storePassword System\.getenv\("EASYOPEN_KEYSTORE_PASSWORD"\)/);
  assert.match(result, /keyAlias System\.getenv\("EASYOPEN_KEY_ALIAS"\)/);
  assert.match(result, /release \{\s+signingConfig signingConfigs\.release/);
  assert.match(result, /debug \{\s+signingConfig signingConfigs\.debug/);
});

test('예상하지 못한 Gradle 템플릿은 안전하게 실패', () => {
  assert.throws(() => addReleaseSigning('android {}'), /signingConfigs block/);
});

test('Android와 Desktop은 같은 EasyOpen 릴리스 버전을 사용',()=>{
  const mobile=require('../package.json');
  const desktop=JSON.parse(fs.readFileSync(path.join(__dirname,'../../desktop/package.json'),'utf8'));
  const expo=require('../app.json').expo;
  assert.equal(mobile.version,desktop.version);
  assert.equal(expo.version,desktop.version);
  assert.equal(mobile.version,'0.1.1-beta.2');
  assert.equal(expo.android.versionCode,3);
});

test('Play 빌드는 EasyOpen 공통 아이콘과 Android adaptive icon을 사용',()=>{
  const expo=require('../app.json').expo;
  assert.equal(expo.icon,'./assets/icon.png');
  assert.equal(expo.android.adaptiveIcon.foregroundImage,'./assets/adaptive-icon.png');
  assert.equal(expo.android.adaptiveIcon.backgroundColor,'#7460F5');
  for(const file of ['icon.png','adaptive-icon.png']){
    const image=fs.readFileSync(path.join(__dirname,'../assets',file));
    assert.equal(image.readUInt32BE(16),1024);
    assert.equal(image.readUInt32BE(20),1024);
  }
});
