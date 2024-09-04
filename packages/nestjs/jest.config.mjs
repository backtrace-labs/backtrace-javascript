/**
 * Node v14 fails with Nest v10, and we cannot install Nest v9
 * due to peer dependency version mismatches.
 * For now, we just disable tests. The package should work fine with Nest v9 and Node v14.
 */
const disableTests = /^v14/.test(process.version);

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    setupFiles: ['./jest.setup.mjs'],
    testPathIgnorePatterns: disableTests ? ['.'] : [],
    passWithNoTests: disableTests,
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: true,
            },
        ],
    },
};
