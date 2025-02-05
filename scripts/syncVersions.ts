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

interface UpdatedDependency {
    readonly name: string;
    readonly version: string;
}

const rootDir = path.join(__dirname, '..');

function parseRange(version: string): readonly [op: string, version?: string] {
    const num = /\d/.exec(version);
    if (!num) {
        return [version, undefined];
    }

    return [version.substring(0, num.index), version.substring(num.index)];
}

function updateDependency(
    packageJson: PackageJson,
    type: DependencyType,
    name: string,
    newVersion: string,
): UpdatedDependency | undefined {
    const deps = packageJson[type];
    if (!deps) {
        return undefined;
    }

    const currentRange = deps[name];
    if (!currentRange) {
        return undefined;
    }

    const [currentOp, currentVersion] = parseRange(currentRange);
    if (currentOp === '*' && !currentVersion) {
        return undefined;
    }

    const newRange = `${currentOp}${newVersion}`;

    if (currentVersion !== newVersion) {
        deps[name] = newRange;
        log(`[${packageJson.name}] - updated ${name} from ${currentRange} to ${newRange} in ${type}`);
        return { name, version: newRange };
    }

    return undefined;
}

function updateVersions(packageJson: PackageJson, currentVersions: Record<string, string>) {
    const updated: UpdatedDependency[] = [];
    function pushIfUpdated(dep: UpdatedDependency | undefined) {
        if (dep) {
            updated.push(dep);
        }
    }

    for (const [name, newVersion] of Object.entries(currentVersions)) {
        pushIfUpdated(updateDependency(packageJson, 'dependencies', name, newVersion));
        pushIfUpdated(updateDependency(packageJson, 'devDependencies', name, newVersion));
        pushIfUpdated(updateDependency(packageJson, 'peerDependencies', name, newVersion));
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
        if (updated.length) {
            if (!dryRun) {
                await savePackageJson(packageJsonPath, packageJson);
            }
            console.log(
                path.relative(process.cwd(), packageJsonPath),
                ...updated.map(({ name, version }) => `${name}:${version}`),
            );
        }
    }
})();
