const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

// const packageDirectory = path.resolve(path.join('../../..', 'packages'));

// const reactNativePath = path.join(packageDirectory, 'react-native');
// const reactPath = path.join(packageDirectory, 'react');
// const sdkCore = path.join(packageDirectory, 'sdk-core');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // nodeModulesPaths: [reactNativePath],
    // unstable_enableSymlinks: true,
    // unstable_enablePackageExports: true,
  },
  // watchFolders: [reactNativePath, reactPath, sdkCore],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
