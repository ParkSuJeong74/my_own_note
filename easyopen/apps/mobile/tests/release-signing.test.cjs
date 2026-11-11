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

test('release 빌드는 GitHub Secrets 기반 키스토어를 사용', () => {
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
  assert.ok(Number.isInteger(expo.android.versionCode)&&expo.android.versionCode>1);
});
