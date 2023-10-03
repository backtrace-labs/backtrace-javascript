const path = require('path');
const { getWebpackTypescriptConfig } = require('../../build/common');
const agentDefinitionPlugin = require('../../build/agentDefinitionPlugin');
const nodeExternals = require('webpack-node-externals');

/** @type {import('webpack').Configuration} */
module.exports = {
    ...getWebpackTypescriptConfig({ configFile: 'tsconfig.build.json' }),
    mode: process.env.NODE_ENV ?? 'production',
    devtool: 'nosources-source-map',
    entry: './src/index.ts',
    target: 'node',
    externalsPresets: { node: true },
    externals: [
        nodeExternals({
            additionalModuleDirs: ['../../node_modules'],
        }),
    ],
    output: {
        filename: 'index.js',
        path: path.join(__dirname, 'lib'),
        libraryTarget: 'commonjs2',
        devtoolModuleFilenameTemplate(info) {
            return path.relative(path.join(__dirname, 'lib'), info.absoluteResourcePath);
        },
    },
    plugins: [agentDefinitionPlugin(path.join(__dirname, 'package.json'))],
    optimization: {
        minimize: false,
    },
};
