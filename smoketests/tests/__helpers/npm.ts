import { SpawnOptionsWithoutStdio } from 'child_process';
import { asyncSpawn } from './asyncSpawn';

export function npm(cwd: string, args: string[], options?: SpawnOptionsWithoutStdio) {
    const command = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
    return asyncSpawn(command, args, {
        ...options,
        cwd,
    });
}

export async function setupNpmApp(cwd: string) {
    await npm(cwd, ['install']);
    await npm(cwd, ['run', 'build']);
}
