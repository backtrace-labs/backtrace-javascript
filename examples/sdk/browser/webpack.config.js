const path = require('path');
const { BacktracePlugin } = require('@backtrace-labs/webpack-plugin');
const { webpackTypescriptConfig } = require('../../../build/common');

/** @type {import('webpack').Configuration} */
module.exports = {
    ...webpackTypescriptConfig,
    target: 'web',
    mode: process.env.NODE_ENV ?? 'production',
    devtool: 'source-map',
    entry: './src/index.ts',
    output: {
        filename: 'index.js',
        path: path.join(__dirname, 'lib'),
    },
    plugins: [new BacktracePlugin()],
};
