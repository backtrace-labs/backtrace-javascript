import { Logger, LogLevel } from '@backtrace/sourcemap-tools';
import { format } from 'util';

export interface CreateLoggerOptions {
    readonly verbose?: boolean[];
    readonly quiet?: boolean;
    readonly 'log-level'?: CliLogLevel;
}

export interface CliLoggerOptions {
    readonly level: CliLogLevel;
    readonly silent?: boolean;
    readonly prefix?: string;
}

export type CliLogLevel = LogLevel | 'output' | 'fatal';

export class CliLogger implements Logger {
    private readonly _levelMap: Record<CliLogLevel, boolean>;

    constructor(public readonly options: CliLoggerOptions) {
        this._levelMap = this.createLevelMap(options.level);
    }

    public clone(options?: Partial<CliLoggerOptions>) {
        return new CliLogger({ ...this.options, ...options });
    }

    public output(value: unknown | Error, ...args: unknown[]) {
        return this.log('output', value, ...args);
    }

    public fatal(value: unknown | Error, ...args: unknown[]) {
        return this.log('fatal', value, ...args);
    }

    public error(value: unknown | Error, ...args: unknown[]) {
        return this.log('error', value, ...args);
    }

    public warn(value: unknown | Error, ...args: unknown[]) {
        return this.log('warn', value, ...args);
    }

    public info(value: unknown | Error, ...args: unknown[]) {
        return this.log('info', value, ...args);
    }

    public debug(value: unknown | Error, ...args: unknown[]) {
        return this.log('debug', value, ...args);
    }

    public trace(value: unknown | Error, ...args: unknown[]) {
        return this.log('trace', value, ...args);
    }

    public log(level: CliLogLevel, value: unknown | Error, ...args: unknown[]) {
        const isOutput = level === 'output';

        if (this.options.silent) {
            return;
        }

        if (!this._levelMap[level]) {
            return;
        }

        const logger = isOutput
            ? (...args: Parameters<typeof console.log>) => console.log(...args)
            : (...args: Parameters<typeof console.error>) => console.error(...args);

        const message: unknown[] = [];

        if (this.options.prefix) {
            message.push(`${this.options.prefix}`);
        }

        if (!isOutput) {
            message.push(`${level}:`);
        }

        if (value instanceof Error) {
            message.push(...args, value);
        } else {
            message.push(value, ...args);
        }

        logger(format(...message));
    }

    private createLevelMap(level: CliLogLevel): Record<CliLogLevel, boolean> {
        const levelMap: Record<CliLogLevel, number> = {
            output: 0,
            fatal: 1,
            error: 2,
            warn: 3,
            info: 4,
            debug: 5,
            trace: 6,
        };

        return {
            output: levelMap[level] >= levelMap['output'],
            fatal: levelMap[level] >= levelMap['fatal'],
            error: levelMap[level] >= levelMap['error'],
            warn: levelMap[level] >= levelMap['warn'],
            info: levelMap[level] >= levelMap['info'],
            debug: levelMap[level] >= levelMap['debug'],
            trace: levelMap[level] >= levelMap['trace'],
        };
    }
}

export function createLogger(options?: CreateLoggerOptions) {
    let level: CliLogLevel | undefined;
    if (options?.['log-level']) {
        level = options?.['log-level'];
    } else if (options?.verbose) {
        switch (options.verbose.length) {
            case 1:
                level = 'debug';
                break;
            case 2:
                level = 'trace';
                break;
        }
    }

    return new CliLogger({ level: level ?? 'info', silent: options?.quiet });
}
