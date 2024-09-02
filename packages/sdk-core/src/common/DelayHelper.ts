import { AbortError } from './AbortError.js';

export class Delay {
    /**
     * Promise set timeout wrapper.
     * @param timeout timeout in ms
     * @param signal abort signal
     */
    public static wait(timeout: number, signal?: AbortSignal) {
        return new Promise<void>((resolve, reject) => {
            // intervalId has to be defined here,
            // as abortCallback can execute before setTimeout is executed
            // eslint-disable-next-line prefer-const
            let intervalId: ReturnType<typeof setTimeout> | undefined;

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
