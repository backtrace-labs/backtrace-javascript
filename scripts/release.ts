#!/usr/bin/env -S node -r ts-node/register

/**
 * 1. Create tag
 * 2. Push tag
 * 3. Publish package
 */

import { executor } from './common/commands';
import { gitAddTag, gitPushTag, gitRemoveTag, gitRemoveTagRemote } from './common/git';
import { log } from './common/output';
import { loadPackageJson, npmPublish } from './common/packageJson';
import { TrasnactionFn, noop, transaction } from './common/transaction';

async function main() {
    const options = ['--dry-run', '--no-tag', '--no-push-tag', '--no-publish'] as const;

    const argv = process.argv.slice(2);
    const [packageJsonPath, commitHash] = argv.filter((v) => !options.includes(v as never));
    const optionValues = options.reduce((val, k) => {
        val[k] = argv.includes(k);
        return val;
    }, {} as Record<(typeof options)[number], boolean>);

    if (!packageJsonPath) {
        throw new Error('first argument must be a package.json path');
    }

    const dryRun = optionValues['--dry-run'];
    if (dryRun) {
        log('dry run enabled');
    }

    const execute = executor(dryRun);

    const packageJson = await loadPackageJson(packageJsonPath);
    const packageName = packageJson.name.replace('@backtrace-labs/', '');
    const tagName = `${packageName}/${packageJson.version}`;

    log(`releasing version ${packageJson.version}`);

    const exit: TrasnactionFn = [
        'exit',
        () => {
            console.log(packageJsonPath);
            process.exit(0);
        },
    ];

    const run = transaction(
        optionValues['--no-tag']
            ? noop
            : ['add tag', () => execute(gitAddTag(tagName, commitHash)), () => execute(gitRemoveTag(tagName))],
        optionValues['--no-tag'] || optionValues['--no-push-tag']
            ? noop
            : ['push tag', () => execute(gitPushTag(tagName)), () => execute(gitRemoveTagRemote(tagName))],
        optionValues['--no-publish'] ? noop : ['npm publish', () => execute(npmPublish(packageJsonPath))],
        exit,
    );

    run();
}

if (require.main === module) {
    main();
}
