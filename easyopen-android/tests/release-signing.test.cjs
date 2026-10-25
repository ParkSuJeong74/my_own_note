const test = require('node:test');
const assert = require('node:assert/strict');
const {addReleaseSigning} = require('../plugins/with-release-signing');

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
  assert.match(result, /storeFile file\(System\.getenv\("EASYOPEN_KEYSTORE_PATH"\)\)/);
  assert.match(result, /storePassword System\.getenv\("EASYOPEN_KEYSTORE_PASSWORD"\)/);
  assert.match(result, /keyAlias System\.getenv\("EASYOPEN_KEY_ALIAS"\)/);
  assert.match(result, /release \{\s+signingConfig signingConfigs\.release/);
  assert.match(result, /debug \{\s+signingConfig signingConfigs\.debug/);
});

test('예상하지 못한 Gradle 템플릿은 안전하게 실패', () => {
  assert.throws(() => addReleaseSigning('android {}'), /signingConfigs block/);
});
