import { Readable } from 'stream';
import { delay } from './delay.js';

interface WaitForOptions {
    readonly retries?: number;
    readonly wait?: number;
    readonly factor?: number;
    readonly signal?: AbortSignal;
}

export async function waitForUrl(url: string, options?: WaitForOptions) {
    let { retries, wait } = {
        retries: 30,
        wait: 1000,
        ...options,
    };

    const { factor, signal } = {
        factor: 1,
        ...options,
    };

    if (retries < 0) {
        throw new Error('retries cannot be less or equal to 0');
    }

    let error: unknown;
    while (retries) {
        try {
            console.log(`Waiting for ${url}, retry=${retries}, delay=${wait}...`);
            const result = await fetch(url, { signal });
            if (result.status === 200) {
                return;
            }
        } catch (err) {
            error = err;

            if (signal?.aborted) {
                break;
            }

            retries--;
            await delay(wait);
            wait *= factor;
        }
    }

    throw error;
}

export async function waitForData(
    readable: Readable,
    regex: RegExp,
    options?: WaitForOptions,
): Promise<RegExpMatchArray> {
    let { retries, wait } = {
        retries: 30,
        wait: 1000,
        ...options,
    };

    const { factor, signal } = {
        factor: 1,
        ...options,
    };

    if (retries < 0) {
        throw new Error('retries cannot be less or equal to 0');
    }

    let stop = false;

    // eslint-disable-next-line no-async-promise-executor
    return new Promise<RegExpMatchArray>(async (resolve, reject) => {
        const onData = (chunk: Buffer) => {
            const data = chunk.toString('utf-8');
            console.log('waitfor:', data, data.match(regex));
            const match = data.match(regex);
            if (match) {
                cleanup();
                resolve(match);
            }
        };

        const onError = (err: unknown) => {
            cleanup();
            reject(err);
        };

        const onAbort = () => {
            onError(new Error('Wait cancelled.'));
        };

        const cleanup = () => {
            stop = true;
            readable.off('error', onError);
            readable.off('data', onData);
            signal?.removeEventListener('abort', onAbort);
        };

        readable.on('error', onError).on('data', onData);
        signal?.addEventListener('abort', onAbort);

        while (retries && !stop) {
            console.log(`Waiting for ${regex}, retry=${retries}, delay=${wait}...`);
            await delay(wait);
            wait *= factor;
            retries--;
        }

        if (stop) {
            return;
        }

        cleanup();
        reject(new Error('Wait timed out.'));
    });
}
