export interface Logger {
    error(value: unknown | Error, ...args: unknown[]): void;
    warn(value: unknown | Error, ...args: unknown[]): void;
    info(value: unknown | Error, ...args: unknown[]): void;
    debug(value: unknown | Error, ...args: unknown[]): void;
    trace(value: unknown | Error, ...args: unknown[]): void;
    log(level: LogLevel, value: unknown | Error, ...args: unknown[]): void;
}

export type LogLevel = keyof Pick<Logger, 'error' | 'warn' | 'info' | 'debug' | 'trace'>;
