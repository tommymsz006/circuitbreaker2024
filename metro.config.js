const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  /*
  resetCache: true,
  */
  resolver: {
    unstable_enablePackageExports: true,
    unstable_conditionNames: ['module', 'import', 'require'],
    extraNodeModules: {
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "os": require.resolve("os-browserify/browser"),
    }
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
