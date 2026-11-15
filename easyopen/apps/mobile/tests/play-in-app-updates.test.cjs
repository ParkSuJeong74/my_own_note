const assert = require('node:assert/strict');
const test = require('node:test');
const {addPlayDependency, addPlayUpdateActivity} = require('../plugins/with-play-in-app-updates');

test('registers the Play dependency once on repeated Expo prebuilds', () => {
  const gradle = 'dependencies {\n    implementation("com.facebook.react:react-android")\n}';
  const configured = addPlayDependency(gradle);
  assert.match(configured, /dependencies \{\n    implementation 'com\.google\.android\.play:app-update:2\.1\.0'/);
  assert.equal(addPlayDependency(configured), configured);
});

test('adds the Play lifecycle to MainActivity and fails when the Expo template changes', () => {
  const activity = 'package kr.io.mano.easyopen\n\nimport android.os.Bundle\n\nclass MainActivity : ReactActivity() {\n  override fun getMainComponentName() = "main"\n}';
  const configured = addPlayUpdateActivity(activity);
  assert.match(configured, /import com\.google\.android\.play\.core\.appupdate\.AppUpdateManagerFactory/);
  assert.match(configured, /override fun onResume\(\)/);
  assert.match(configured, /override fun getMainComponentName\(\) = "main"/);
  assert.equal(addPlayUpdateActivity(configured), configured);
  assert.throws(() => addPlayUpdateActivity(activity.replace('ReactActivity()', 'OtherActivity()')), /template anchor/);
});
