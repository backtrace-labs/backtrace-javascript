export class Delay {
    /**
     * Promise set timeout wrapper.
     * @param timeout timeout in ms
     * @param signal abort signal
     */
    public static wait(timeout: number, signal?: AbortSignal) {
        return new Promise<void>((resolve, reject) => {
            function abortCallback() {
                clearTimeout(intervalId);
                reject();
            }

            const intervalId = setTimeout(() => {
                signal?.removeEventListener('abort', abortCallback);
                resolve();
            }, timeout);

            signal?.addEventListener('abort', abortCallback);
        });
    }
}
