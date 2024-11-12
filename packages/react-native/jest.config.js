/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'react-native',
    testEnvironment: 'node',
    setupFiles: ['./jest.setup.js'],
    globalSetup: './jest.rng.mjs',
};
