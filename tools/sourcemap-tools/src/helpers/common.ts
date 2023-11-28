import fs from 'fs';
import { Readable, Writable } from 'stream';
import { LogLevel, Logger } from '../Logger';
import { Err, Ok, Result, ResultPromise } from '../models/Result';

export type ContentFile = readonly [content: string, path: string];
export type StreamFile = readonly [stream: Readable, path: string];

export async function readFile(file: string): ResultPromise<string, string> {
    try {
        return Ok(await fs.promises.readFile(file, 'utf-8'));
    } catch (err) {
        return Err(`failed to read file: ${err}`);
    }
}

export function writeFile(path: string) {
    return async function writeFile(content: string) {
        try {
            await fs.promises.writeFile(path, content);
            return Ok(content);
        } catch (err) {
            return Err(`failed to write file: ${err}`);
        }
    };
}

export async function statFile(path: string) {
    try {
        return Ok(await fs.promises.stat(path));
    } catch (err) {
        return Err(`failed to stat file: ${err}`);
    }
}

export function createWriteStream(path: string) {
    try {
        return Ok(fs.createWriteStream(path));
    } catch (err) {
        return Err(`failed to create write stream to file: ${err}`);
    }
}

export function pipeStream(readable: Pick<Readable, 'pipe'>) {
    return function pipeStream(writable: Writable) {
        return readable.pipe(writable);
    };
}

export async function writeStream(file: StreamFile) {
    const [stream, path] = file;
    try {
        const output = fs.createWriteStream(path);
        stream.pipe(output);
        return new Promise<Result<StreamFile, string>>((resolve) => {
            output.on('error', (err) => {
                resolve(Err(`failed to write file: ${err.message}`));
            });

            output.on('finish', () => resolve(Ok(file)));
        });
    } catch (err) {
        return Err(`failed to write file: ${err}`);
    }
}

export function parseJSON<T>(content: string): Result<T, string> {
    try {
        return Ok(JSON.parse(content));
    } catch (err) {
        return Err(`failed to parse content: ${err}`);
    }
}

export function pass<T>(t: T): T {
    return t;
}

export function failIfEmpty<E>(error: E) {
    return function failIfEmpty<T>(t: T[]): Result<T[], E> {
        return t.length ? Ok(t) : Err(error);
    };
}

export function map<T, B>(fn: (t: T) => B) {
    return function map(t: T[]) {
        return t.map(fn);
    };
}

export function flatMap<T, B>(fn: (t: T) => B[]) {
    return function flatMap(t: T[]) {
        return t.reduce((res, v) => {
            res.push(...fn(v));
            return res;
        }, [] as B[]);
    };
}

export function mapAsync<T, B>(fn: (t: T) => B | Promise<B>) {
    return async function map(t: T[]) {
        return await Promise.all(t.map(fn));
    };
}

export function filter<T>(fn: (t: T) => boolean) {
    return function filter(t: T[]) {
        return t.filter(fn);
    };
}

export function filterAsync<T>(fn: (t: T) => boolean | Promise<boolean>) {
    return async function filterAsync(t: T[]) {
        const results = await Promise.all(t.map(async (v) => [v, await fn(v)] as const));
        return results.filter((r) => r[1]).map((r) => r[0]);
    };
}

export function log(logger: Logger, level: LogLevel) {
    return function log<T>(message: string | ((t: T) => string)) {
        return inspect<T>((t) => logger[level](typeof message === 'function' ? message(t) : message));
    };
}

export function inspect<T>(fn: (t: T) => unknown) {
    return function inspect(t: T): T {
        fn(t);
        return t;
    };
}

export function not(value: boolean) {
    return !value;
}
