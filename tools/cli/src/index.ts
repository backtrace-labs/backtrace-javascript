import commandLineArgs from 'command-line-args';
import { Command } from './commands/Command';
import { LoggerOptions, createLogger } from './logger';
import { processCmd } from './sourcemaps/process';

export interface GlobalOptions extends LoggerOptions {
    readonly help: boolean;
}

const mainCommand = new Command<GlobalOptions>({
    name: '',
})
    .subcommand(processCmd)
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
        description: 'Verbosity level. -v prints info logs, -vv prints debug logs, -vvv prints ALL logs.',
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
        description: 'Sets the logging level. Can be one of: quiet, error, warn, info, debug, verbose',
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
