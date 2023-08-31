#!/usr/bin/env node

import { AsyncResult, Err } from '@backtrace-labs/sourcemap-tools';
import commandLineArgs from 'command-line-args';
import { Command } from './commands/Command';
import { loadVersion } from './helpers/version';
import { LoggerOptions, createLogger } from './logger';
import { DEFAULT_OPTIONS_PATH } from './options/loadOptions';
import { addSourcesCmd } from './sourcemaps/add-sources';
import { processCmd } from './sourcemaps/process';
import { uploadCmd } from './sourcemaps/upload';

export interface GlobalOptions extends LoggerOptions {
    readonly help: boolean;
    readonly config: string;
}

export interface MainOptions {
    readonly version: boolean;
}

const mainCommand = new Command<GlobalOptions & MainOptions>({
    name: '',
})
    .subcommand(processCmd)
    .subcommand(uploadCmd)
    .subcommand(addSourcesCmd)
    .option({
        name: 'help',
        type: Boolean,
        alias: 'h',
        global: true,
        description: 'Displays this help message.',
    })
    .option({
        name: 'verbose',
        type: Boolean,
        alias: 'v',
        global: true,
        multiple: true,
        description: 'Verbosity level. -v prints debug logs, -vv prints ALL logs.',
    })
    .option({
        name: 'quiet',
        type: Boolean,
        alias: 'q',
        global: true,
        description: 'Disables ALL logging messages.',
    })
    .option({
        name: 'log-level',
        type: String,
        global: true,
        description: 'Sets the logging level. Can be one of: quiet, error, warn, info, debug, verbose. Default: info',
    })
    .option({
        name: 'config',
        type: String,
        global: true,
        description: `Path to the config file. Default: ${DEFAULT_OPTIONS_PATH}`,
    })
    .option({
        name: 'version',
        type: Boolean,
        description: 'Displays the version of backtrace-js',
    })
    .execute(function ({ opts, getHelpMessage }) {
        const logger = createLogger(opts);
        if (opts.version) {
            return AsyncResult.equip(loadVersion())
                .then((version) => logger.output(version))
                .then(() => 0).inner;
        } else {
            logger.info(getHelpMessage());

            const unknownOption = opts._unknown?.[0];
            if (!unknownOption) {
                return Err(`Unknown command.`);
            }

            if (unknownOption.startsWith('-')) {
                return Err(`Unknown option: ${unknownOption}`);
            }

            return Err(`Unknown command: ${unknownOption}`);
        }
    });

(async () => {
    const result = await mainCommand.run(process.argv);
    if (result.isOk()) {
        process.exit(result.data);
    } else {
        const loggerOptions = commandLineArgs(mainCommand.options, { partial: true }) as Partial<LoggerOptions>;
        const logger = createLogger(loggerOptions);
        logger.error(result.data.error);
        process.exit(1);
    }
})();
