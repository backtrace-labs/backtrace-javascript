import { Err, Ok, Result, ResultPromise } from '@backtrace/sourcemap-tools';
import fs from 'fs';

export type ContentFile = readonly [content: string, path: string];

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

export function passOk<T>(t: T): Result<T, never> {
    return Ok(t);
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
