import { AsyncResult, Ok, readFile, ResultPromise } from '@backtrace-labs/sourcemap-tools';
import { parseJSONC } from '../helpers/jsonc';
import { CliOptions, CommandCliOptions } from './models/CliOptions';

export const DEFAULT_OPTIONS_PATH = '.backtracejsrc';

export function loadAndJoinOptions(path?: string) {
    let readOptions: CliOptions | undefined;

    return async function loadAndJoinOptions<K extends keyof CommandCliOptions>(
        key: K,
        options: Partial<CommandCliOptions[K]>,
        defaults?: Partial<CommandCliOptions[K]>,
    ): ResultPromise<Partial<CommandCliOptions[K]>, string> {
        if (readOptions) {
            return Ok(joinOptions(key, options, defaults)(readOptions));
        }

        const readResult = await readFile(path ?? DEFAULT_OPTIONS_PATH);
        if (readResult.isErr()) {
            return path ? readResult : Ok(options);
        }

        return AsyncResult.equip(readResult)
            .then(parseJSONC<CliOptions>)
            .then((opts) => (readOptions = opts))
            .then(joinOptions(key, options, defaults)).inner;
    };
}

export async function loadOptions(path?: string): ResultPromise<CliOptions | undefined, string> {
    const readResult = await readFile(path ?? DEFAULT_OPTIONS_PATH);
    if (readResult.isErr()) {
        return path ? readResult : Ok(undefined);
    }

    return AsyncResult.equip(readResult).then(parseJSONC<CliOptions>).inner;
}

export function joinOptions<K extends keyof CommandCliOptions>(
    key: K,
    options: Partial<CommandCliOptions[K]>,
    defaults?: Partial<CommandCliOptions[K]>,
) {
    return function joinOptions(loadedOptions: CliOptions): Partial<CommandCliOptions[K] & CliOptions> {
        return {
            ...defaults,
            ...loadedOptions,
            ...loadedOptions[key],
            ...options,
            'add-sources': undefined,
            upload: undefined,
            process: undefined,
        };
    };
}
