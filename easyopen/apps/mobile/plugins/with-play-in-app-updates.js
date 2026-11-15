const {withAppBuildGradle, withMainActivity} = require('expo/config-plugins');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');

const dependency = "implementation 'com.google.android.play:app-update:2.1.0'";
const activityCode = readFileSync(join(__dirname, 'play-in-app-updates.kt.inc'), 'utf8');

function insertAfter(contents, anchor, addition) {
  if (contents.split(anchor).length !== 2) {
    throw new Error('Could not locate the Android template anchor: ' + anchor);
  }
  return contents.replace(anchor, anchor + addition);
}

function addPlayDependency(contents) {
  if (contents.includes(dependency)) return contents;
  return insertAfter(contents, 'dependencies {', '\n    ' + dependency);
}

function addPlayUpdateActivity(contents) {
  if (contents.includes('private val playUpdateManager')) return contents;
  const imports = [
    'android.app.AlertDialog',
    'android.util.Log',
    'androidx.activity.result.contract.ActivityResultContracts',
    'com.google.android.play.core.appupdate.AppUpdateManagerFactory',
    'com.google.android.play.core.appupdate.AppUpdateOptions',
    'com.google.android.play.core.install.InstallStateUpdatedListener',
    'com.google.android.play.core.install.model.AppUpdateType',
    'com.google.android.play.core.install.model.InstallStatus',
    'com.google.android.play.core.install.model.UpdateAvailability',
  ];
  const withImports = insertAfter(contents, 'import android.os.Bundle', '\n' + imports.map(name => 'import ' + name).join('\n'));
  return insertAfter(withImports, 'class MainActivity : ReactActivity() {', '\n' + activityCode);
}

module.exports = function withPlayInAppUpdates(config) {
  config = withAppBuildGradle(config, result => {
    if (result.modResults.language !== 'groovy') throw new Error('EasyOpen expects Groovy app Gradle');
    result.modResults.contents = addPlayDependency(result.modResults.contents);
    return result;
  });
  return withMainActivity(config, result => {
    if (result.modResults.language !== 'kt') throw new Error('EasyOpen expects Kotlin MainActivity');
    result.modResults.contents = addPlayUpdateActivity(result.modResults.contents);
    return result;
  });
};
module.exports.addPlayDependency = addPlayDependency;
module.exports.addPlayUpdateActivity = addPlayUpdateActivity;
