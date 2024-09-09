import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import packageJson from './package.json' with { type: 'json' };

const extensions = ['.js', '.ts'];

/**
 * Include and exclude externals based on patterns.
 * If module is included, is is treated as NOT external.
 *
 * Include is resolved first, then exclude.
 * If both patterns miss, the module is included.
 */
function externals({ include, exclude }) {
    function test(pattern, id) {
        if (pattern instanceof RegExp) {
            return pattern.test(id);
        }

        return pattern === id;
    }

    return (id) => {
        if (include.some((pattern) => test(pattern, id))) {
            return false;
        }

        if (exclude.some((pattern) => test(pattern, id))) {
            return true;
        }

        return false;
    };
}

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
    external: externals({
        include: [/tslib/],
        exclude: [/\/node_modules\//, '@backtrace/node'],
    }),
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
