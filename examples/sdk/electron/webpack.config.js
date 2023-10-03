const path = require('path');
const { BacktracePlugin } = require('@backtrace-labs/webpack-plugin');
const { getWebpackTypescriptConfig } = require('../../../build/common');

/** @type {import('webpack').Configuration} */
module.exports = {
    ...getWebpackTypescriptConfig({ configFile: 'tsconfig.renderer.json' }),
    target: 'web',
    mode: process.env.NODE_ENV ?? 'production',
    devtool: 'source-map',
    entry: './src/renderer/index.ts',
    output: {
        filename: 'index.js',
        path: path.join(__dirname, 'lib/renderer'),
    },
    plugins: [new BacktracePlugin()],
};
