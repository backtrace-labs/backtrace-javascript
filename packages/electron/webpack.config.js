const path = require('path');
const { getWebpackTypescriptConfig } = require('../../build/common');
const agentDefinitionPlugin = require('../../build/agentDefinitionPlugin');
const nodeExternals = require('webpack-node-externals');

/** @type {import('webpack').Configuration} */
const main = {
    ...getWebpackTypescriptConfig({ configFile: 'tsconfig.main.json' }),
    mode: process.env.NODE_ENV ?? 'production',
    devtool: 'nosources-source-map',
    entry: {
        index: './src/main/index.ts',
    },
    target: 'electron-main',
    externalsPresets: { node: true },
    externals: [
        nodeExternals({
            additionalModuleDirs: ['../../node_modules'],
        }),
    ],
    output: {
        filename: '[name].js',
        path: path.join(__dirname, 'lib/main'),
        libraryTarget: 'commonjs2',
        devtoolModuleFilenameTemplate(info) {
            return path.relative(path.join(__dirname, 'lib/main'), info.absoluteResourcePath);
        },
    },
    plugins: [agentDefinitionPlugin(path.join(__dirname, 'package.json'))],
    optimization: {
        minimize: false,
    },
};

/** @type {import('webpack').Configuration} */
const preload = {
    ...getWebpackTypescriptConfig({ configFile: 'tsconfig.main.json' }),
    mode: process.env.NODE_ENV ?? 'production',
    devtool: 'nosources-source-map',
    entry: {
        preload: './src/main/preload.ts'
    },
    target: 'electron-preload',
    output: {
        filename: '[name].js',
        path: path.join(__dirname, 'lib/main'),
        devtoolModuleFilenameTemplate(info) {
            return path.relative(path.join(__dirname, 'lib/main'), info.absoluteResourcePath);
        },
    },
    plugins: [agentDefinitionPlugin(path.join(__dirname, 'package.json'))],
    optimization: {
        minimize: false,
    },
};

/** @type {import('webpack').Configuration} */
const renderer = {
    ...getWebpackTypescriptConfig({ configFile: 'tsconfig.renderer.json' }),
    mode: process.env.NODE_ENV ?? 'production',
    devtool: 'source-map',
    entry: {
        index: './src/renderer/index.ts'
    },
    target: 'electron-renderer',
    output: {
        filename: '[name].js',
        path: path.join(__dirname, 'lib/renderer'),
        libraryTarget: 'commonjs2',
    },
    plugins: [agentDefinitionPlugin(path.join(__dirname, 'package.json'))],
    optimization: {
        minimize: false,
    },
};

module.exports = [main, preload, renderer];