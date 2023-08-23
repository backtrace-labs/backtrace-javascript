const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
// const path = require('path');

// const packagePath = path.resolve(
//   path.join('../../..', 'packages', 'react-native'),
// );

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  //   resolver: {
  //     nodeModulesPaths: [packagePath],
  //   },
  //   watchFolders: [packagePath],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
