#!/usr/bin/env -S node -r ts-node/register

/**
 * This scripts makes sure that all packages use the newest versions of dependencies.
 * Without arguments, it reads all workspaces from root package.json and checks all workspaces.
 * Pass paths to package.json files as arguments to parse only those.
 */

import path from 'path';
import { parseOptions } from './common/options';
import { log } from './common/output';
import {
    DependencyType,
    PackageJson,
    getWorkspacePackageJsonPaths,
    loadPackageJson,
    savePackageJson,
} from './common/packageJson';

const rootDir = path.join(__dirname, '..');

function updateDependency(packageJson: PackageJson, type: DependencyType, name: string, newVersion: string) {
    const deps = packageJson[type];
    if (!deps) {
        return false;
    }

    const currentVersion = deps[name];
    if (!currentVersion) {
        return false;
    }

    if (currentVersion !== newVersion) {
        deps[name] = newVersion;
        log(`[${packageJson.name}] - updated ${name} from ${currentVersion} to ${newVersion} in ${type}`);

        return true;
    }

    return false;
}

function updateVersions(packageJson: PackageJson, currentVersions: Record<string, string>) {
    let updated = false;

    for (const [name, version] of Object.entries(currentVersions)) {
        const newVersion = `^${version}`;

        updated = updateDependency(packageJson, 'dependencies', name, newVersion) || updated;
        updated = updateDependency(packageJson, 'devDependencies', name, newVersion) || updated;
        updated = updateDependency(packageJson, 'peerDependencies', name, newVersion) || updated;
    }

    if (!updated) {
        log(`[${packageJson.name}] - no changes`);
    }

    return updated;
}

(async () => {
    const options = ['--dry-run'] as const;
    const rootPackageJson = await loadPackageJson(path.join(rootDir, 'package.json'));
    const workspacePackageJsonPaths = getWorkspacePackageJsonPaths(rootPackageJson);
    const workspacePackageJsons = await Promise.all(workspacePackageJsonPaths.map(loadPackageJson));

    const [positionalArgs, { '--dry-run': dryRun }] = parseOptions(options);
    const packageJsonPathsToSync = positionalArgs.length ? positionalArgs : workspacePackageJsonPaths;

    if (dryRun) {
        log('dry run enabled');
    }

    const currentVersions = workspacePackageJsons.reduce(
        (obj, pj) => {
            obj[pj.name] = pj.version;
            return obj;
        },
        {} as Record<string, string>,
    );

    for (const packageJsonPath of packageJsonPathsToSync) {
        const packageJson = await loadPackageJson(packageJsonPath);
        const updated = updateVersions(packageJson, currentVersions);
        if (updated) {
            if (!dryRun) {
                await savePackageJson(packageJsonPath, packageJson);
            }
            console.log(path.relative(process.cwd(), packageJsonPath));
        }
    }
})();
