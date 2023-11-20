const packageJson = require('./package.json');

// Copied from node_modules/react-native-builder-bob/lib/utils/compile.js
module.exports = function getConfig(modules) {
    return {
        plugins: [
            [
                'search-and-replace',
                {
                    rules: [
                        {
                            search: 'BACKTRACE_AGENT_NAME',
                            replace: packageJson.name,
                        },
                        {
                            search: 'BACKTRACE_AGENT_VERSION',
                            replace: packageJson.version,
                        },
                    ],
                },
            ],
        ],
        presets: [
            [
                require.resolve('@babel/preset-env'),
                {
                    targets: {
                        browsers: [
                            '>1%',
                            'last 2 chrome versions',
                            'last 2 edge versions',
                            'last 2 firefox versions',
                            'last 2 safari versions',
                            'not dead',
                            'not ie <= 11',
                            'not op_mini all',
                            'not android <= 4.4',
                            'not samsung <= 4',
                        ],
                        node: '16',
                    },
                    useBuiltIns: false,
                    modules,
                },
            ],
            require.resolve('@babel/preset-react'),
            require.resolve('@babel/preset-typescript'),
            require.resolve('@babel/preset-flow'),
        ],
    };
};
