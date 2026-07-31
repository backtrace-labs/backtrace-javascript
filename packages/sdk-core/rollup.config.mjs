import typescript from '@rollup/plugin-typescript';

/** @type {import('rollup').RollupOptions} */
export default {
    input: './src/index.ts',
    output: [
        {
            file: 'lib/bundle.mjs',
            format: 'esm',
            sourcemap: true,
        },
        {
            file: 'lib/bundle.cjs',
            format: 'cjs',
            sourcemap: true,
        },
    ],
    // bundle tslib so the ES5 output is self-contained
    external: (id) => /node_modules/.test(id) && !/tslib/.test(id),
    plugins: [typescript({ tsconfig: './tsconfig.build.json' })],
};
