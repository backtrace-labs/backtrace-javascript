import { Err, Ok, Result } from '@backtrace/sourcemap-tools';
import commandLineArgs from 'command-line-args';
import commandLineUsage, { Section } from 'command-line-usage';
import { LoggerOptions, createLogger } from '../logger';
import { CommandError } from '../models/CommandError';
import { ExtendedOptionDefinition } from '../models/OptionDefinition';

const CLI_COMMAND = 'backtrace';

export class Command<T extends object = object> {
    public readonly subcommands: Command[] = [];
    public readonly options: ExtendedOptionDefinition[] = [];
    public readonly helpSections: Section[] = [];
    private _execute?: (
        this: this,
        values: Partial<T>,
        stack?: Command[],
    ) => Result<number, string> | Promise<Result<number, string>>;

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

        const values = commandLineArgs(localOptions, {
            argv,
            stopAtFirstUnknown: subCommandMode,
        });

        if (subCommandMode && values._subcommand) {
            const subcommand = this.subcommands.find((s) => s.definition.name === values._subcommand);
            if (subcommand) {
                const subcommandValues = commandLineArgs([subcommandOption], { argv, stopAtFirstUnknown: true });
                return await subcommand.run(subcommandValues._unknown ?? [], [...(stack ?? []), this]);
            }
        }

        const logger = createLogger(values as LoggerOptions);

        if (values.help) {
            logger.output(this.getHelpMessage(stack));
            return Ok(0);
        }

        if (this._execute) {
            return (await this._execute.call(this, values as T, stack)).mapErr((error) => ({
                command: this,
                error,
                stack,
            }));
        }

        logger.info(this.getHelpMessage(stack));

        if (subCommandMode) {
            return Err({ command: this, stack, error: 'Unknown command.' });
        }

        return Err({ command: this, stack, error: 'Unknown option.' });
    }

    public getHelpMessage(stack?: Command[]) {
        const globalOptions = [
            ...this.options.filter((o) => o.global),
            ...(stack?.flatMap((o) => o.options.filter((o) => o.global)) ?? []),
        ];

        const nonGlobalOptions = this.options.filter((o) => !o.global);

        let cmd = CLI_COMMAND;
        const stackCmd = `${
            [...(stack ?? []), this]
                .map((s) => s.definition.name)
                .filter((s) => !!s)
                .join(' ') ?? ''
        }`;

        if (stackCmd) {
            cmd += ` ${stackCmd}`;
        }

        let usage = cmd;
        if (this.subcommands.length) {
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

        if (this.helpSections.length) {
            sections.push(...this.helpSections);
        }

        sections.push({
            content: `Usage: ${usage}`,
        });

        if (this.subcommands.length) {
            sections.push({
                header: 'Available commands',
                content: this.subcommands.map((s) => ({
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
}
