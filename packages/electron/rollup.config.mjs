import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from 'rollup-plugin-typescript2';
import packageJson from './package.json' with { type: 'json' };

const extensions = ['.js', '.ts'];

function outputs(baseName) {
    return [
        {
            file: baseName + '.mjs',
            format: 'esm',
            sourcemap: true,
        },
        {
            file: baseName + '.cjs',
            format: 'cjs',
            sourcemap: true,
        },
    ];
}

function commonPlugins() {
    return [nodeResolve({ extensions, preferBuiltins: true }), commonjs({ defaultIsModuleExports: true }), json()];
}

/** @type {import('rollup').RollupOptions} */
const main = {
    input: './src/main/index.ts',
    output: outputs('main/index'),
    external: [/\/node_modules\//, '@backtrace/node'],
    plugins: [
        typescript({ tsconfig: './tsconfig.main.json', useTsconfigDeclarationDir: true }),
        replace({
            BACKTRACE_AGENT_NAME: packageJson.name,
            BACKTRACE_AGENT_VERSION: packageJson.version,
            preventAssignment: true,
        }),
        ...commonPlugins(),
    ],
};

/** @type {import('rollup').RollupOptions} */
const preload = {
    input: './src/main/preload.ts',
    output: outputs('main/preload'),
    external: [/\/node_modules\//, '@backtrace/node'],
    plugins: [typescript({ tsconfig: './tsconfig.main.json', useTsconfigDeclarationDir: true }), ...commonPlugins()],
};

/** @type {import('rollup').RollupOptions} */
const renderer = {
    input: './src/renderer/index.ts',
    output: outputs('renderer/index'),
    plugins: [
        typescript({ tsconfig: './tsconfig.renderer.json', useTsconfigDeclarationDir: true }),
        ...commonPlugins(),
    ],
};

export default [main, preload, renderer];
