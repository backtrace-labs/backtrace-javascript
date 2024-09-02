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
    external: [/node_modules/],
    plugins: [typescript({ tsconfig: './tsconfig.build.json' })],
};
