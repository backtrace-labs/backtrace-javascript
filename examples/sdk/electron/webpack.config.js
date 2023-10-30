const path = require('path');
const { getWebpackTypescriptConfig } = require('../../../build/common');
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
    externals: [
        nodeExternals({
            additionalModuleDirs: ['../../node_modules'],
        }),
    ],
    output: {
        filename: '[name].js',
        path: path.join(__dirname, 'lib/main'),
        devtoolModuleFilenameTemplate(info) {
            return path.relative(path.join(__dirname, 'lib/main'), info.absoluteResourcePath);
        },
    },
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
    },
};

module.exports = [main, preload, renderer];