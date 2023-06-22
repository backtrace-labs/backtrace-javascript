/** @type {import('webpack').Configuration} */
const webpackTypescriptConfig = {
    resolve: {
        extensions: ['.js', '.ts', '.jsx', '.tsx'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
            },
        ],
    },
};

module.exports = { webpackTypescriptConfig };
