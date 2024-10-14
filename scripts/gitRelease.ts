#!/usr/bin/env -S node -r ts-node/register

/**
 * 1. Increment version
 * 2. Checkout to release/<new version>
 * 3. npm i
 * 4. commit package.json of package and package-lock.json
 * 5. push to release/<new version>
 */

import path from 'path';
import semver, { ReleaseType, SemVer } from 'semver';
import { executor } from './common/commands';
import {
    gitAdd,
    gitCheckoutToBranch,
    gitCommit,
    gitCreateBranch,
    gitDeleteBranch,
    gitGetCurrentBranch,
    gitPush,
    gitReset,
    gitResetToCommit,
    gitRestoreFile,
} from './common/git';
import { log } from './common/output';
import { PackageJson, loadPackageJson, npmInstall, npmRun, savePackageJson } from './common/packageJson';
import { TrasnactionFn, transaction } from './common/transaction';

const rootDir = path.join(__dirname, '..');

function updateVersion(
    packageJson: PackageJson,
    versionOrRelease: ReleaseType | string,
    identifier?: string,
    rawIdentifierBase?: string,
): PackageJson {
    let version = packageJson.version;
    try {
        const identifierBase: semver.inc.IdentifierBase | false | undefined =
            rawIdentifierBase === '0' || rawIdentifierBase === '1'
                ? rawIdentifierBase
                : rawIdentifierBase === 'false'
                  ? false
                  : undefined;

        const result = semver.inc(version, versionOrRelease as ReleaseType, identifier, identifierBase);
        if (result == null) {
            throw new Error('failed to increment version');
        }
        version = result;
    } catch {
        version = new SemVer(versionOrRelease).raw;
    }

    return {
        ...packageJson,
        version: version,
    };
}

async function main() {
    const options = [
        '--dry-run',
        '--no-push',
        '--no-commit',
        '--no-checkout',
        '--no-add',
        '--no-sync',
        '--name',
    ] as const;

    const argv = process.argv.slice(2);
    const [packageJsonPath, versionOrRelease, identifier] = argv.filter((v) => !options.some((o) => v.startsWith(o)));

    if (!packageJsonPath) {
        throw new Error('first argument must be a package.json path');
    }

    const optionValues = options.reduce(
        (val, k) => {
            const opt = argv.find((v) => v.startsWith(`${k}=`));
            if (opt) {
                val[k] = opt.replace(`${k}=`, '');
            } else {
                val[k] = argv.includes(k);
            }

            return val;
        },
        {} as Record<(typeof options)[number], boolean | string>,
    );

    const dryRun = optionValues['--dry-run'];
    if (dryRun) {
        log('dry run enabled');
    }

    const execute = executor(!!dryRun);

    const packageLockPath = path.relative(process.cwd(), path.join(rootDir, 'package-lock.json'));
    const packageJson = await loadPackageJson(packageJsonPath);
    const packageName =
        typeof optionValues['--name'] === 'string'
            ? optionValues['--name']
            : packageJson.name.replace('@backtrace/', '');
    const updatedPackageJson = versionOrRelease
        ? updateVersion(packageJson, versionOrRelease, identifier)
        : packageJson;
    const currentBranch = execute(gitGetCurrentBranch());
    const branchName = `${packageName}/${updatedPackageJson.version}`;

    if (packageJson.version !== updatedPackageJson.version) {
        log(`updating version from ${packageJson.version} to ${updatedPackageJson.version}`);
    }

    const exit: TrasnactionFn = [
        'exit',
        () => {
            console.log(packageJsonPath);
            process.exit(0);
        },
    ];

    const filesToAdd: string[] = [
        packageJsonPath,
        packageLockPath,
        path.join(path.dirname(packageJsonPath), 'CHANGELOG.md'),
    ];
    if (!dryRun) {
        await savePackageJson(packageJsonPath, updatedPackageJson);
    }

    if (!optionValues['--no-sync']) {
        const execute = executor();
        const args = dryRun ? ['--dry-run'] : [];
        const syncedPackages = execute(npmRun('syncVersions', { args }))
            .trim()
            .split('\n')
            .filter((f) => !!f);
        for (const path of syncedPackages) {
            filesToAdd.push(path);
        }
    }

    const run = transaction(
        ['npm install', () => execute(npmInstall()), () => execute(gitRestoreFile(packageLockPath))],
        optionValues['--no-add']
            ? exit
            : ['add files to git', () => execute(gitAdd(...filesToAdd)), () => execute(gitReset(...filesToAdd))],
        optionValues['--no-checkout']
            ? exit
            : ['create branch', () => execute(gitCreateBranch(branchName)), () => execute(gitDeleteBranch(branchName))],
        [
            'checkout to branch',
            () => execute(gitCheckoutToBranch(branchName)),
            () => execute(gitCheckoutToBranch(currentBranch)),
        ],
        optionValues['--no-commit']
            ? exit
            : [
                  'commit changes',
                  () => execute(gitCommit(`${packageName}: version ${updatedPackageJson.version}`)),
                  () => execute(gitResetToCommit('HEAD~1')),
              ],
        optionValues['--no-push'] ? exit : ['push to remote', () => log(execute(gitPush(branchName)))],
        exit,
    );

    run();
}

if (require.main === module) {
    main();
}
