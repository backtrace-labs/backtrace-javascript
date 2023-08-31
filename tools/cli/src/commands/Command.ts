import { Err, Ok, Result } from '@backtrace-labs/sourcemap-tools';
import commandLineArgs from 'command-line-args';
import commandLineUsage, { Section } from 'command-line-usage';
import { LoggerOptions, createLogger } from '../logger';
import { CommandError } from '../models/CommandError';
import { ExtendedOptionDefinition } from '../models/OptionDefinition';

const CLI_COMMAND = 'backtrace-js';

export type CommandFunction<T> = (
    context: CommandContext<T>,
) => Result<number, string> | Promise<Result<number, string>>;

export interface CommandOptions {
    readonly _unknown?: string[];
}

export interface CommandContext<T> {
    readonly opts: Partial<T> & CommandOptions;
    getHelpMessage(): string;
}

export class Command<T extends object = object> {
    public readonly subcommands: Command[] = [];
    public readonly options: ExtendedOptionDefinition[] = [];
    public readonly helpSections: Section[] = [];
    private _execute?: CommandFunction<T>;

    constructor(public readonly definition: ExtendedOptionDefinition) {}

    public subcommand(command: Command): this {
        this.subcommands.push(command);
        return this;
    }

    public option<N extends keyof T & string>(option: ExtendedOptionDefinition<N>): this {
        this.options.push(option);
        return this;
    }

    public help(...sections: Section[]): this {
        this.helpSections.push(...sections);
        return this;
    }

    public execute(fn: Command<T>['_execute']): this {
        this._execute = fn;
        return this;
    }

    public async run(argv: string[], stack?: Command[]): Promise<Result<number, CommandError>> {
        const stackOptions = stack?.flatMap((s) => s.options.filter((o) => o.global)) ?? [];
        const localOptions = [...this.options, ...stackOptions];
        const subcommandOption = {
            name: '_subcommand',
            defaultOption: true,
        };

        const subCommandMode = !!this.subcommands.length;
        if (subCommandMode) {
            localOptions.push(subcommandOption);
        }

        const valuesResult = this.safeCommandLineArgs(localOptions, {
            argv,
            stopAtFirstUnknown: subCommandMode,
        });

        if (valuesResult.isErr()) {
            const logger = createLogger();
            logger.info(Command.getHelpMessage(this, stack));
            return valuesResult.mapErr((error) => ({ command: this, error, stack }));
        }

        const values = valuesResult.data;

        if (subCommandMode && values._subcommand) {
            const subcommand = this.subcommands.find((s) => s.definition.name === values._subcommand);
            if (subcommand) {
                const subcommandValues = commandLineArgs([subcommandOption], { argv, stopAtFirstUnknown: true });
                return await subcommand.run(subcommandValues._unknown ?? [], [...(stack ?? []), this]);
            }
        }

        const logger = createLogger(values as LoggerOptions);

        if (values.help) {
            logger.output(Command.getHelpMessage(this, stack));
            return Ok(0);
        }

        if (this._execute) {
            const context: CommandContext<T> = {
                opts: values as T,
                getHelpMessage: () => Command.getHelpMessage(this, stack),
            };

            return (await this._execute(context)).mapErr((error) => ({
                command: this,
                error,
                stack,
            }));
        }

        logger.info(Command.getHelpMessage(this, stack));

        if (subCommandMode) {
            return Err({ command: this, stack, error: 'Unknown command.' });
        }

        return Err({ command: this, stack, error: 'Unknown option.' });
    }

    public static getHelpMessage(command: Command, stack?: Command[]) {
        const globalOptions = [
            ...command.options.filter((o) => o.global),
            ...(stack?.flatMap((o) => o.options.filter((o) => o.global)) ?? []),
        ];

        const nonGlobalOptions = command.options.filter((o) => !o.global);

        let cmd = CLI_COMMAND;
        const stackCmd = `${
            [...(stack ?? []), command]
                .map((s) => s.definition.name)
                .filter((s) => !!s)
                .join(' ') ?? ''
        }`;

        if (stackCmd) {
            cmd += ` ${stackCmd}`;
        }

        let usage = cmd;
        if (command.subcommands.length) {
            usage += ' <command>';
        }

        const defaultOption =
            nonGlobalOptions.find((s) => s.defaultOption) ?? globalOptions.find((s) => s.defaultOption);
        if (defaultOption) {
            usage += ` <${defaultOption.name}>`;
        }

        if (globalOptions.length + nonGlobalOptions.length) {
            usage += ' [options]';
        }

        const sections: Section[] = [
            {
                header: cmd,
                content: 'Backtrace utility for managing Javascript files.',
            },
        ];

        if (command.helpSections.length) {
            sections.push(...command.helpSections);
        }

        sections.push({
            content: `Usage: ${usage}`,
        });

        if (command.subcommands.length) {
            sections.push({
                header: 'Available commands',
                content: command.subcommands.map((s) => ({
                    name: s.definition.name,
                    summary: s.definition.description,
                })),
            });
        }

        if (nonGlobalOptions.length) {
            sections.push({
                header: 'Available options',
                optionList: nonGlobalOptions,
            });
        }

        if (globalOptions.length) {
            sections.push({
                header: 'Global options',
                optionList: globalOptions,
            });
        }

        return commandLineUsage(sections);
    }

    private safeCommandLineArgs(...args: Parameters<typeof commandLineArgs>) {
        try {
            return Ok(commandLineArgs(...args));
        } catch (err) {
            if (err instanceof Error) {
                if (err.name === 'UNKNOWN_OPTION') {
                    return Err(err.message);
                }
            }

            throw err;
        }
    }
}
