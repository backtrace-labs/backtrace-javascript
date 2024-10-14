const { execSync } = require('child_process');
const path = require('path');
const chalk = require('chalk');

const oneOf =
    (...fns) =>
    (...args) =>
        fns.some((fn) => fn(...args));
const startsWith = (what) => (str) => str.startsWith(what);
const nthPathPart = (n) => (pathStr) => path.normalize(pathStr).split(path.sep)[n];
const csv = (array) => (array.length ? array.join(', ') : '<none>');
const ciEquals = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0;

const changePrefix = [
    // packages/sdk-core/file.ts => sdk-core
    // tools/cli/file.ts => cli
    [oneOf(startsWith('packages/'), startsWith('tools/')), nthPathPart(1)],

    // smoketests/dir/file.ts => smoketests
    // scripts/dir/file.ts => scripts
    [oneOf(startsWith('smoketests/'), startsWith('scripts/')), nthPathPart(0)],
];

function getChangePrefix(filePath) {
    for (const [test, prefix] of changePrefix) {
        if (test(filePath)) {
            return prefix(filePath);
        }
    }
}

function unique(...values) {
    return [...new Set(...values)];
}

function getExpectedPrefixes(modifiedFiles) {
    return unique(modifiedFiles.split('\n').map(getChangePrefix)).filter((f) => !!f);
}

function getActualPrefixes(message) {
    if (!message.includes(':')) {
        return [[], message];
    }

    const [prefix, rest] = message.split(':');
    if (!prefix) {
        return [[], message];
    }

    return [prefix.split(', '), (rest && rest.trim()) || ''];
}

function getMissingPrefixes(expected, actual) {
    const missing = [];

    for (const prefix of expected) {
        if (!actual.includes(prefix)) {
            missing.push(prefix);
        }
    }

    return missing;
}

function normalizeExpectedPrefixes(expected, missing, actual) {
    const normalizedActual = actual.map((a) => expected.find((e) => ciEquals(a, e)) || a);
    const missingFromNormalized = missing.filter((m) => !normalizedActual.includes(m));
    return [...normalizedActual, ...missingFromNormalized];
}

function banner(str) {
    const repeat = (n, what) => [...new Array(n)].map(() => what).join('');

    console.error(chalk.red(repeat(str.length + 10, '=')));
    console.error(chalk.red(`${repeat(4, '=')} ${str.toUpperCase()} ${repeat(4, '=')}`));
    console.error(chalk.red(repeat(str.length + 10, '=')));
}

const message = process.argv[2];
const modifiedFiles = execSync('git diff --cached --name-only').toString('utf-8');
const expected = getExpectedPrefixes(modifiedFiles);
const [actual, rest] = getActualPrefixes(message);

if (!actual.length) {
    banner('Commit message is invalid - missing prefix');

    console.error('To better describe commit messages, we require including prefixes based on file changes:');
    console.error('');
    console.error(chalk.gray('>'), 'prefix1, prefix2: brief description of change');
    console.error('');
    console.error('Suggested message:');
    console.error('');
    console.error(chalk.red(`- ${message}`));
    console.error(chalk.green(`+ ${expected.length ? csv(expected) : 'prefix'}: ${message}`));

    process.exit(1);
}

const missing = getMissingPrefixes(expected, actual);
if (missing.length) {
    banner('Commit message is invalid - invalid prefixes');

    console.error('Some prefixes are missing based on changed files:');
    console.error(chalk.red(`- ${csv(missing)}`));
    console.error('');
    console.error('Suggested message:');
    console.error(chalk.red(`- ${csv(actual)}: ${rest}`));
    console.error(chalk.green(`+ ${csv(normalizeExpectedPrefixes(expected, missing, actual))}: ${rest}`));

    process.exit(1);
}
