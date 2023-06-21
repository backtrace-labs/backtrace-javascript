const path = require('path');
const { BacktracePlugin } = require('./lib');
const nodeExternals = require('webpack-node-externals');

/** @type {import('webpack').Configuration} */
module.exports = {
    entry: './src/index.ts',
    devtool: 'source-map',
    mode: 'production',
    target: 'node',
    externalsPresets: { node: true },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    stats: {
        logging: 'verbose',
    },
    module: {
        rules: [
            {
                test: /.ts$/,
                loader: 'ts-loader',
                options: {
                    configFile: 'tsconfig.build.json',
                },
            },
        ],
    },
    output: {
        path: path.join(__dirname, './webpackBuild'),
        filename: '[name].js',
    },
    externals: [
        nodeExternals({
            additionalModuleDirs: ['../../node_modules'],
        }),
    ],
    plugins: [new BacktracePlugin({})],
};
