import { SpawnSyncReturns, spawnSync } from 'child_process';

export interface SpawnCommandOptions {
    readonly command: string;
    readonly args?: string[];
    readonly cwd?: string;
    response?(res: SpawnSyncReturns<string>): string;
    validate?(res: SpawnSyncReturns<string>): boolean;
}

export function spawnCommandSync(opts: SpawnCommandOptions) {
    const output = spawnSync(opts.command, opts.args ?? [], {
        encoding: 'utf-8',
        cwd: opts.cwd,
    });

    if ((opts.validate && !opts.validate(output)) || output.status) {
        throw new Error(`Failed to execute ${opts.command}: ${output.stderr || output.stdout}`);
    }

    return opts.response ? opts.response(output) : output.stdout;
}

export function printCommand(opts: SpawnCommandOptions) {
    console.log('+', opts.command, ...(opts.args ?? []).map((a) => (/\s/.test(a) ? `"${a}"` : a)));
    return opts;
}

export function executor(dryRun?: boolean) {
    return (opts: SpawnCommandOptions) => {
        printCommand(opts);
        if (dryRun) {
            return '<dry-run>';
        }

        return spawnCommandSync(opts);
    };
}
