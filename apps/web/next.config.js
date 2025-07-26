//@ts-check
const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = async () => {
  // @ts-expect-error TypeScript does not recognize the getConfig function
  const { getConfig, getPublicConfig } = require('@my_own_note/core');

  const config = await getConfig();
  const publicConfig = await getPublicConfig();

  return {
    nx: {},
    serverRuntimeConfig: config,
    publicRuntimeConfig: publicConfig,
  };
};

const plugins = [withNx];

module.exports = composePlugins(...plugins)(nextConfig);
