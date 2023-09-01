import { AsyncResult, Ok, readFile, ResultPromise } from '@backtrace-labs/sourcemap-tools';
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
        if (readOptions) {
            return Ok(joinOptions(key, defaults)(readOptions));
        }

        const readResult = await readFile(path ?? DEFAULT_OPTIONS_FILENAME);
        if (readResult.isErr()) {
            return path ? readResult : Ok({});
        }

        return AsyncResult.equip(readResult)
            .then(parseJSONC<CliOptions>)
            .then((opts) => (readOptions = opts))
            .then(joinOptions(key, defaults)).inner;
    };
}

export async function loadOptions(path?: string): ResultPromise<CliOptions | undefined, string> {
    const readResult = await readFile(path ?? DEFAULT_OPTIONS_FILENAME);
    if (readResult.isErr()) {
        return path ? readResult : Ok(undefined);
    }

    return AsyncResult.equip(readResult).then(parseJSONC<CliOptions>).inner;
}

export function joinOptions<K extends keyof CommandCliOptions>(key: K, defaults?: Partial<CommandCliOptions[K]>) {
    return function joinOptions(loadedOptions: CliOptions): Partial<CommandCliOptions[K] & CliOptions> {
        return {
            ...defaults,
            ...loadedOptions,
            ...loadedOptions[key],
            'add-sources': undefined,
            upload: undefined,
            process: undefined,
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
