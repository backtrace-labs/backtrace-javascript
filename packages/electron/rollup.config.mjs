import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import fs from 'fs-extra';
import path from 'path';

import packageJson from './package.json' with { type: 'json' };

const extensions = ['.js', '.ts'];

const outputDir = '.';

function outputs(baseName) {
    return [
        {
            file: path.join(outputDir, baseName + '.mjs'),
            format: 'esm',
            sourcemap: true,
        },
        {
            file: path.join(outputDir, baseName + '.cjs'),
            format: 'cjs',
            sourcemap: true,
        },
    ];
}

function commonPlugins() {
    return [nodeResolve({ extensions, preferBuiltins: true }), commonjs({ defaultIsModuleExports: true }), json()];
}

/**
 *
 * @returns {import('rollup').Plugin}
 */
function moveFiles(from, to) {
    return {
        name: 'move-files',
        async closeBundle() {
            // if (!(await fs.exists(from))) {
            //     return;
            // }

            await fs.copy(from, to, { errorOnExist: false, overwrite: true, preserveTimestamps: true });
            await fs.rm(from, { recursive: true });
        },
    };
}

/** @type {import('rollup').RollupOptions} */
const main = {
    input: './src/main/index.ts',
    output: outputs('main/index'),
    external: [/\/node_modules\//, '@backtrace/node'],
    plugins: [
        typescript({ tsconfig: './tsconfig.main.json' }),
        replace({
            BACKTRACE_AGENT_NAME: packageJson.name,
            BACKTRACE_AGENT_VERSION: packageJson.version,
            preventAssignment: true,
        }),
        moveFiles('./main/__types', '.'),
        ...commonPlugins(),
    ],
};

/** @type {import('rollup').RollupOptions} */
const preload = {
    input: './src/main/preload.ts',
    output: outputs('main/preload'),
    external: [/\/node_modules\//, '@backtrace/node'],
    plugins: [typescript({ tsconfig: './tsconfig.main.json' }), moveFiles('./main/__types', '.'), ...commonPlugins()],
};

/** @type {import('rollup').RollupOptions} */
const renderer = {
    input: './src/renderer/index.ts',
    output: outputs('renderer/index'),
    plugins: [
        typescript({ tsconfig: './tsconfig.renderer.json' }),
        moveFiles('./renderer/__types', '.'),
        ...commonPlugins(),
    ],
};

export default [main, preload, renderer];
