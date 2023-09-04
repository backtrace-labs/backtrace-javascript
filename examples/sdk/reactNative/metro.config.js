const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const packageDirectory = path.resolve(path.join('../../..', 'packages'));

const reactNativePath = path.join(packageDirectory, 'react-native');
const reactNativeNodeModulePath = path.join(reactNativePath, 'node_modules');
/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
    resolver: {
        unstable_enableSymlinks: true,
    },
    watchFolders: [
        reactNativePath,
        reactNativeNodeModulePath,
        // , reactPath, sdkCore
    ],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
