#!/usr/bin/env node

import { Err, R, pipe } from '@backtrace-labs/sourcemap-tools';
import commandLineArgs from 'command-line-args';
import { Command } from './commands/Command';
import { loadVersion } from './helpers/version';
import { CreateLoggerOptions, createLogger } from './logger';
import { DEFAULT_OPTIONS_FILENAME } from './options/loadOptions';
import { addSourcesCmd } from './sourcemaps/add-sources';
import { processCmd } from './sourcemaps/process';
import { runCmd } from './sourcemaps/run';
import { uploadCmd } from './sourcemaps/upload';

export interface GlobalOptions extends CreateLoggerOptions {
    readonly help: boolean;
    readonly config: string;
}

export interface MainOptions {
    readonly version: boolean;
}

const mainCommand = new Command<GlobalOptions & MainOptions>({
    name: '',
})
    .subcommand(runCmd)
    .subcommand(processCmd)
    .subcommand(addSourcesCmd)
    .subcommand(uploadCmd)
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
        description: `Path to the config file. Default: ${DEFAULT_OPTIONS_FILENAME}`,
    })
    .option({
        name: 'version',
        type: Boolean,
        description: 'Displays the version of backtrace-js',
    })
    .execute(async function ({ opts, getHelpMessage }) {
        const logger = createLogger(opts);
        if (opts.version) {
            return pipe(
                await loadVersion(),
                R.map((version) => logger.output(version)),
            );
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
        const loggerOptions = commandLineArgs(mainCommand.options, { partial: true }) as Partial<CreateLoggerOptions>;
        const logger = createLogger(loggerOptions);
        logger.fatal(result.data.error);
        process.exit(1);
    }
})();
