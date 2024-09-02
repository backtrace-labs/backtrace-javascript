import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import packageJson from './package.json' with { type: 'json' };

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
            file: 'lib/bundle.cjs',
            format: 'cjs',
            sourcemap: true,
        },
    ],
    external: [/\/node_modules\//, '@backtrace/sdk-core'],
    plugins: [
        typescript({ tsconfig: './tsconfig.build.json' }),
        nodeResolve({ extensions, preferBuiltins: true }),
        commonjs({ defaultIsModuleExports: true }),
        replace({
            BACKTRACE_AGENT_NAME: packageJson.name,
            BACKTRACE_AGENT_VERSION: packageJson.version,
            preventAssignment: true,
        }),
        json(),
    ],
};
