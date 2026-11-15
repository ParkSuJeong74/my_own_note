const {withInfoPlist} = require('expo/config-plugins');

function iosMarketingVersion(version) {
  const match = /^(\d+\.\d+\.\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(version);
  if (!match) throw new Error('Expected an EasyOpen release version');
  return match[1];
}

module.exports = function withIosMarketingVersion(config) {
  return withInfoPlist(config, result => {
    result.modResults.CFBundleShortVersionString = iosMarketingVersion(config.version);
    return result;
  });
};
module.exports.iosMarketingVersion = iosMarketingVersion;
