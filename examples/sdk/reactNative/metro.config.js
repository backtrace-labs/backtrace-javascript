const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: [
    path.resolve('../../../packages/react-native'),
    path.resolve('../../../packages/react-native/node_modules'),
    path.resolve('../../../node_modules'),
    path.resolve('../../../packages/sdk-core'),
  ],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
