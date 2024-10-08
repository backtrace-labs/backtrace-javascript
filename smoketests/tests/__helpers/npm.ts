import fs from 'fs/promises';
import path from 'path';
import { asyncSpawn, AsyncSpawnOptions, AsyncSpawnResult } from './asyncSpawn.js';

export function npm(cwd: string, args: string[], options?: AsyncSpawnOptions) {
    const isWindows = /^win/.test(process.platform);
    const command = isWindows ? 'npm.cmd' : 'npm';
    return asyncSpawn(command, isWindows ? args.map((a) => `"${a}"`) : args, {
        ...options,
        shell: isWindows,
        cwd,
    });
}

async function cleanNpmApp(cwd: string) {
    await npm(cwd, ['run', '--if-present', 'clean']);
    await fs.rm(path.join(cwd, 'node_modules'), { recursive: true, force: true });
    await fs.rm(path.join(cwd, 'package-lock.json'), { force: true });
}

export async function setupNpmApp(cwd: string, ...scripts: string[][]) {
    await npm(cwd, ['install']);
    for (const args of scripts) {
        await npm(cwd, ['run', ...args]);
    }
}

export function useNpmApp(cwd: string, ...scripts: string[][]) {
    beforeAll(async () => {
        await cleanNpmApp(cwd);
        await setupNpmApp(cwd, ...scripts);
    });
}

export function useNpmScript(cwd: string, script: string[]) {
    const abort = new AbortController();

    let appPromise: Promise<AsyncSpawnResult>;

    beforeAll(async () => {
        appPromise = npm(cwd, script, {
            signal: abort.signal,
        });
    });

    afterAll(async () => {
        abort.abort();
        await appPromise;
    });
}
