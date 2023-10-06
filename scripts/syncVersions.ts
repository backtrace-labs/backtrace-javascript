#!/usr/bin/env -S node -r ts-node/register

/**
 * This scripts makes sure that all packages use the newest versions of dependencies.
 * Without arguments, it reads all workspaces from root package.json and checks all workspaces.
 * Pass paths to package.json files as arguments to parse only those.
 */

import fs from 'fs';
import path from 'path';

const rootDir = path.join(__dirname, '..');

interface PackageJson {
    readonly name: string;
    readonly version: string;
    readonly workspaces?: string[];
    readonly dependencies?: Record<string, string>;
    readonly devDependencies?: Record<string, string>;
    readonly peerDependencies?: Record<string, string>;
}

type Dependencies = keyof Pick<PackageJson, 'dependencies' | 'devDependencies' | 'peerDependencies'>;

async function loadPackageJson(packageJsonPath: string): Promise<PackageJson> {
    const error = new Error(`${packageJsonPath} does not seem to be a valid package.json file`);

    let packageJson: Partial<PackageJson>;
    try {
        packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf-8')) as Partial<PackageJson>;
    } catch {
        throw error;
    }

    if (!packageJson.name || !packageJson.version) {
        throw error;
    }

    return packageJson as PackageJson;
}

async function savePackageJson(packageJsonPath: string, packageJson: PackageJson) {
    return await fs.promises.writeFile(packageJsonPath, JSON.stringify(packageJson, null, '    ') + '\n');
}

function getWorkspacePackageJsonPaths(packageJson: PackageJson) {
    return packageJson.workspaces?.map((workspaceDir) => path.join(rootDir, workspaceDir, 'package.json')) ?? [];
}

function updateVersions(packageJson: PackageJson, currentVersions: Record<string, string>) {
    let updated = false;

    for (const [name, version] of Object.entries(currentVersions)) {
        const newVersion = `^${version}`;

        function updateDependency(type: Dependencies) {
            const deps = packageJson[type];
            if (!deps) {
                return;
            }

            const currentVersion = deps[name];
            if (!currentVersion) {
                return;
            }

            if (currentVersion !== newVersion) {
                deps[name] = newVersion;
                console.log(
                    `[${packageJson.name}] - updated ${name} from ${currentVersion} to ${newVersion} in ${type}`,
                );

                return true;
            }
        }

        updated = updateDependency('dependencies') || updated;
        updated = updateDependency('devDependencies') || updated;
        updated = updateDependency('peerDependencies') || updated;
    }

    if (!updated) {
        console.log(`[${packageJson.name}] - no changes`);
    }

    return packageJson;
}

(async () => {
    const rootPackageJson = await loadPackageJson(path.join(rootDir, 'package.json'));
    const workspacePackageJsonPaths = getWorkspacePackageJsonPaths(rootPackageJson);
    const workspacePackageJsons = await Promise.all(workspacePackageJsonPaths.map(loadPackageJson));

    const args = process.argv.slice(2);
    const packageJsonPathsToSync = args.length ? args : workspacePackageJsonPaths;

    const currentVersions = workspacePackageJsons.reduce((obj, pj) => {
        obj[pj.name] = pj.version;
        return obj;
    }, {} as Record<string, string>);

    for (const packageJsonPath of packageJsonPathsToSync) {
        const packageJson = await loadPackageJson(packageJsonPath);
        const updatedPackageJson = updateVersions(packageJson, currentVersions);
        await savePackageJson(packageJsonPath, updatedPackageJson);
    }
})();
