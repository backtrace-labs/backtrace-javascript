import fs from 'fs';
import path from 'path';
import { SpawnCommandOptions } from './commands';

const rootDir = path.join(__dirname, '../..');

export interface PackageJson {
    readonly name: string;
    readonly version: string;
    readonly workspaces?: string[];
    readonly dependencies?: Record<string, string>;
    readonly devDependencies?: Record<string, string>;
    readonly peerDependencies?: Record<string, string>;
}

export type DependencyType = keyof Pick<PackageJson, 'dependencies' | 'devDependencies' | 'peerDependencies'>;

export interface Dependency {
    readonly name: string;
    readonly version: string;
    readonly type: DependencyType;
}

export async function loadPackageJson(packageJsonPath: string): Promise<PackageJson> {
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

export async function savePackageJson(packageJsonPath: string, packageJson: PackageJson) {
    return await fs.promises.writeFile(packageJsonPath, JSON.stringify(packageJson, null, '    ') + '\n');
}

export function getWorkspacePackageJsonPaths(packageJson: PackageJson) {
    return packageJson.workspaces?.map((workspaceDir) => path.join(rootDir, workspaceDir, 'package.json')) ?? [];
}

export function npmInstall(): SpawnCommandOptions {
    return {
        command: 'npm',
        args: ['install'],
        cwd: rootDir,
    };
}

export function npmPublish(packageJsonPath: string) {
    return {
        command: 'npm',
        args: ['publish'],
        cwd: path.dirname(packageJsonPath),
    };
}
