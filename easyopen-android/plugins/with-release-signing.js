const {withAppBuildGradle} = require('expo/config-plugins');

function addReleaseSigning(contents) {
    const signingBlock = /(signingConfigs\s*\{[\s\S]*?)(\n\s{4}\}\n\s{4}buildTypes\s*\{)/;

    if (!signingBlock.test(contents)) {
      throw new Error('Android signingConfigs block was not found');
    }

    let next = contents.replace(
      signingBlock,
      `$1
        release {
            storeFile file(System.getenv("EASYOPEN_KEYSTORE_PATH"))
            storePassword System.getenv("EASYOPEN_KEYSTORE_PASSWORD")
            keyAlias System.getenv("EASYOPEN_KEY_ALIAS")
            keyPassword System.getenv("EASYOPEN_KEY_PASSWORD")
        }$2`,
    );

    const releaseBlock = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
    if (!releaseBlock.test(next)) {
      throw new Error('Android release buildType was not found');
    }

    next = next.replace(releaseBlock, '$1signingConfig signingConfigs.release');
    return next;
}

function withReleaseSigning(config) {
  return withAppBuildGradle(config, (result) => {
    result.modResults.contents = addReleaseSigning(result.modResults.contents);
    return result;
  });
}

module.exports = withReleaseSigning;
module.exports.addReleaseSigning = addReleaseSigning;
