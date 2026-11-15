const assert = require('node:assert/strict');
const test = require('node:test');
const {iosMarketingVersion} = require('../plugins/with-ios-marketing-version');

test('uses a numeric Apple version while preserving the shared beta version in Expo config', () => {
  const {expo} = require('../app.json');
  assert.match(expo.version, /-beta\./);
  assert.equal(iosMarketingVersion(expo.version), expo.version.split('-')[0]);
  assert.equal(iosMarketingVersion('1.2.3'), '1.2.3');
  assert.throws(() => iosMarketingVersion('invalid'), /release version/);
});
