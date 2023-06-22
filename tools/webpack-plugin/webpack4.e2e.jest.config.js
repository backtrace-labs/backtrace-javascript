/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    setupFiles: ['./tests/setupWebpackV4.ts'],
    roots: ['./tests/e2e'],
};
