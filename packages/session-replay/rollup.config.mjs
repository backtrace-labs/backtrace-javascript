import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import path from 'path';
import typescript from 'rollup-plugin-typescript2';

const extensions = ['.js', '.ts'];

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
            file: 'lib/bundle.min.mjs',
            format: 'esm',
            sourcemap: true,
            plugins: [terser()],
        },
        {
            file: 'lib/bundle.cjs',
            format: 'cjs',
            sourcemap: true,
        },
        {
            file: 'lib/bundle.min.cjs',
            format: 'cjs',
            sourcemap: true,
            plugins: [terser()],
        },
    ],
    plugins: [
        typescript({ tsconfig: './tsconfig.build.json' }),
        nodeResolve({
            extensions,
            preferBuiltins: true,
            modulePaths: [path.resolve('./node_modules'), path.resolve('../../node_modules')],
        }),
        commonjs({ defaultIsModuleExports: true }),
        json(),
    ],
};
