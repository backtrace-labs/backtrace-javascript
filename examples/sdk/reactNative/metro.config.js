const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const packageDirectory = path.resolve(path.join('../../..', 'packages'));

const reactNativePath = path.join(packageDirectory, 'react-native');
const reactPath = path.join(packageDirectory, 'react');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    nodeModulesPaths: [reactNativePath, reactPath],
    unstable_enableSymlinks: true,
    unstable_enablePackageExports: true,
  },
  watchFolders: [reactNativePath, reactPath],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
