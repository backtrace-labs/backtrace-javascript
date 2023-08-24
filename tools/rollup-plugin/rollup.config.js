const typescript = require('@rollup/plugin-typescript');
const { BacktracePlugin } = require('./lib');

module.exports = {
    input: 'src/index.ts',
    output: {
        dir: 'rollupBuild',
        format: 'cjs',
        sourcemap: true,
    },
    plugins: [typescript({ tsconfig: './tsconfig.rollup.json' }), BacktracePlugin()],
    external: ['@backtrace-labs/sourcemap-tools', 'fs', 'path'],
};
