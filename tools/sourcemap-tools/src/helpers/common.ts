import fs from 'fs';
import { Readable, Writable } from 'stream';
import { LogLevel, Logger } from '../Logger';
import { ResultPromise } from '../models/AsyncResult';
import { Err, Ok, Result } from '../models/Result';

export type ContentFile = readonly [content: string, path: string];
export type StreamFile = readonly [stream: Readable, path: string];

export async function readFile(file: string): ResultPromise<string, string> {
    try {
        return Ok(await fs.promises.readFile(file, 'utf-8'));
    } catch (err) {
        return Err(`failed to read file: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
}

export async function writeFile(file: ContentFile) {
    const [content, path] = file;
    try {
        await fs.promises.writeFile(path, content);
        return Ok(file);
    } catch (err) {
        return Err(`failed to write file: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
}

export function createWriteStream(path: string) {
    try {
        return Ok(fs.createWriteStream(path));
    } catch (err) {
        return Err(`failed to create write stream to file: ${err instanceof Error ? err.message : 'unknown error'}`);
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
        return Err(`failed to write file: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
}

export function parseJSON<T>(content: string): Result<T, string> {
    try {
        return Ok(JSON.parse(content));
    } catch (err) {
        return Err(`failed to parse content: ${err instanceof Error ? err.message : 'unknown error'}`);
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

export function filter<T>(fn: (t: T) => boolean) {
    return function filter(t: T[]) {
        return t.filter(fn);
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
