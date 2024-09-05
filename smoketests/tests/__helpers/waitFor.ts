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
