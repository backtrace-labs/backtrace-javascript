import { spawn, SpawnOptionsWithoutStdio } from 'child_process';

export interface AsyncSpawnResult {
    readonly stdout: string;
    readonly stderr: string;
}

interface AsyncSpawnOptions extends SpawnOptionsWithoutStdio {
    readonly signal?: AbortSignal;
    readonly debugName?: string;
}

export async function asyncSpawn(command: string, args: string[], options?: AsyncSpawnOptions) {
    const debugName = options?.debugName ?? `${command} ${args.join(' ')}`;

    return new Promise<AsyncSpawnResult>((resolve, reject) => {
        const optionsWithoutSignal = {
            ...options,
            signal: undefined,
        };

        const childProc = spawn(command, args, optionsWithoutSignal);

        let stdout = '';
        let stderr = '';

        childProc.stdout.on('data', (data: Buffer) => {
            console.log(`${debugName}:`, data.toString('utf-8'));
            stdout += data.toString('utf-8');
        });

        childProc.stderr.on('data', (data: Buffer) => {
            console.error(`${debugName}:`, data.toString('utf-8'));
            stderr += data.toString('utf-8');
        });

        options?.signal?.addEventListener('abort', () => {
            childProc.kill('SIGKILL');
        });

        childProc.on('exit', (code) => {
            if (code !== 0 && !options?.signal?.aborted) {
                return reject(Error(`${debugName} exited with code ${code}\nstdout: ${stdout}\nstderr: ${stderr}`));
            }

            resolve({
                stdout,
                stderr,
            });
        });
    });
}
