import { AbortError } from './AbortError';

export class Delay {
    /**
     * Promise set timeout wrapper.
     * @param timeout timeout in ms
     * @param signal abort signal
     */
    public static wait(timeout: number, signal?: AbortSignal) {
        return new Promise<void>((resolve, reject) => {
            let intervalId: NodeJS.Timeout | undefined;
            function abortCallback() {
                clearTimeout(intervalId);
                reject(new AbortError());
            }

            if (signal?.aborted) {
                return abortCallback();
            }

            intervalId = setTimeout(() => {
                signal?.removeEventListener('abort', abortCallback);
                resolve();
            }, timeout);

            signal?.addEventListener('abort', abortCallback);
        });
    }
}
