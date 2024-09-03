import { SpawnOptionsWithoutStdio } from 'child_process';
import { asyncSpawn } from './asyncSpawn';

export function npm(cwd: string, args: string[], options?: SpawnOptionsWithoutStdio) {
    const isWindows = /^win/.test(process.platform);
    const command = isWindows ? 'npm.cmd' : 'npm';
    return asyncSpawn(command, args, {
        ...options,
        shell: isWindows,
        cwd,
    });
}

export async function setupNpmApp(cwd: string) {
    await npm(cwd, ['install']);
    await npm(cwd, ['run', 'build']);
}
