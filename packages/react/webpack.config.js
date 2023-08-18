const path = require('path');
const { webpackTypescriptConfig, minifiedAndUnminified } = require('../../build/common');
const agentDefinitionPlugin = require('../../build/agentDefinitionPlugin');

/** @type {import('webpack').Configuration} */
const common = {
    ...webpackTypescriptConfig,
    target: 'web',
    mode: process.env.NODE_ENV ?? 'production',
    devtool: 'source-map',
    entry: './src/index.ts',
    plugins: [agentDefinitionPlugin(path.join(__dirname, 'package.json'))],
    externals: {
        react: true
    }
};

/** @type {Array<import('webpack').Configuration>} */
module.exports = [
    ...minifiedAndUnminified({
        ...common,
        output: {
            filename: 'index.js',
            path: path.join(__dirname, 'lib'),
            library: {
                name: 'Backtrace',
                type: 'umd',
            },
        },
    }),
];
