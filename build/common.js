const path = require('path');

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

function minifiedAndUnminified(/** @type {import('webpack').Configuration} */ config) {
    const { name, ext } = path.parse(config.output.filename);

    return [
        {
            ...config,
            output: {
                ...config.output,
            },
            optimization: {
                minimize: false,
            },
        },
        {
            ...config,
            output: {
                ...config.output,
                filename: `${name}.min${ext}`,
            },
            optimization: {
                minimize: true,
            },
        },
    ];
}

module.exports = { webpackTypescriptConfig, minifiedAndUnminified };
