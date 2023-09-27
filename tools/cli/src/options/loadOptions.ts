import { Err, Ok, pipe, R, readFile, ResultPromise } from '@backtrace-labs/sourcemap-tools';
import fs from 'fs';
import path from 'path';
import { parseJSONC } from '../helpers/jsonc';
import { CliOptions, CommandCliOptions } from './models/CliOptions';

export const DEFAULT_OPTIONS_FILENAME = '.backtracejsrc';

export function loadOptionsForCommand(path?: string) {
    let readOptions: CliOptions | undefined;

    return async function loadAndJoinOptions<K extends keyof CommandCliOptions>(
        key: K,
        defaults?: Partial<CommandCliOptions[K]>,
    ): ResultPromise<Partial<CommandCliOptions[K]>, string> {
        return pipe(
            path,
            (path) => (!readOptions ? loadOptions(path) : Ok(readOptions)),
            R.map((data) => (data ? (readOptions = data) : data)),
            R.map((data) => (data ? joinOptions(key, defaults)(data) : {})),
        );
    };
}

export async function loadOptions(path?: string): ResultPromise<CliOptions | undefined, string> {
    return pipe(
        path ?? DEFAULT_OPTIONS_FILENAME,
        readFile,
        R.mapErr((r) => (path ? Err(r) : Ok(undefined))),
        R.map((data) => (data ? parseJSONC<CliOptions>(data) : Ok(undefined))),
    );
}

export function joinOptions<K extends keyof CommandCliOptions>(key: K, defaults?: Partial<CommandCliOptions[K]>) {
    return function joinOptions(loadedOptions: CliOptions): Partial<CommandCliOptions[K]> {
        return {
            ...defaults,
            ...loadedOptions,
            'add-sources': undefined,
            upload: undefined,
            process: undefined,
            ...loadedOptions[key],
        };
    };
}

export async function findConfig(
    searchPath = process.cwd(),
    name = DEFAULT_OPTIONS_FILENAME,
): Promise<string | undefined> {
    const paths = await readdir(searchPath);
    if (paths.includes(name)) {
        return path.join(searchPath, name);
    }

    return undefined;
}

async function readdir(path: string) {
    try {
        return await fs.promises.readdir(path);
    } catch (err) {
        return [];
    }
}
