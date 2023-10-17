import { SpawnCommandOptions, spawnCommandSync } from './commands';

export function gitGetCurrentBranch(): SpawnCommandOptions {
    return {
        command: 'git',
        args: ['branch', '--show-current'],
        response: (res) => res.stdout.trim(),
    };
}

export function gitGetRemote(): SpawnCommandOptions {
    return {
        command: 'git',
        args: ['remote', 'show'],
        response(output) {
            const remotes = output.stdout.trim().split('\n');
            if (remotes.find((r) => r === 'origin')) {
                return 'origin';
            }
            return remotes[0];
        },
    };
}

export function gitAdd(...paths: string[]): SpawnCommandOptions {
    return {
        command: 'git',
        args: ['add', '--', ...paths],
    };
}

export function gitReset(...paths: string[]): SpawnCommandOptions {
    return {
        command: 'git',
        args: ['reset', '--', ...paths],
    };
}

export function gitCommit(message: string): SpawnCommandOptions {
    return {
        command: 'git',
        args: ['commit', '-m', message],
    };
}

export function gitResetToCommit(hash: string): SpawnCommandOptions {
    return {
        command: 'git',
        args: ['reset', '--soft', hash],
    };
}

export function gitCheckoutToBranch(branch: string) {
    return {
        command: 'git',
        args: ['checkout', branch],
    };
}

export function gitCreateBranch(branch: string) {
    return {
        command: 'git',
        args: ['branch', branch],
    };
}

export function gitDeleteBranch(branch: string) {
    return {
        command: 'git',
        args: ['branch', '-D', branch],
    };
}

export function gitRestoreFile(file: string) {
    return {
        command: 'git',
        args: ['checkout', 'HEAD', '--', file],
    };
}

export function gitPush(branch?: string, remote?: string) {
    return {
        command: 'git',
        args: [
            'push',
            '-u',
            remote ?? spawnCommandSync(gitGetRemote()),
            branch ?? spawnCommandSync(gitGetCurrentBranch()),
        ],
    };
}
