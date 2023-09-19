/* eslint-disable @typescript-eslint/no-explicit-any */
interface EventCallback {
    callback: (...args: any[]) => unknown;
    once?: boolean;
}

export class Events<
    const E extends Record<string | number | symbol, (...args: any[]) => unknown> = Record<
        string | number | symbol,
        (...args: any[]) => unknown
    >,
> {
    private readonly _callbacks: Partial<Record<keyof E, EventCallback[]>> = {};

    public on<N extends keyof E>(event: N, callback: E[N]): this {
        this.addCallback(event, { callback });
        return this;
    }

    public once<N extends keyof E>(event: N, callback: E[N]): this {
        this.addCallback(event, { callback, once: true });
        return this;
    }

    public off<N extends keyof E>(event: N, callback: E[N]): this {
        this.removeCallback(event, callback);
        return this;
    }

    public emit<N extends keyof E>(event: N, ...args: Parameters<E[N]>): boolean {
        const callbacks = this._callbacks[event];
        if (!callbacks || !callbacks.length) {
            return false;
        }

        for (const { callback, once } of [...callbacks]) {
            try {
                callback(...args);
            } catch {
                // Do nothing
            }

            if (once) {
                this.removeCallback(event, callback);
            }
        }

        return true;
    }

    private addCallback(event: keyof E, callback: EventCallback) {
        const list = this._callbacks[event];
        if (list) {
            list.push(callback);
        } else {
            this._callbacks[event] = [callback];
        }
    }

    private removeCallback(event: keyof E, callback: EventCallback['callback']) {
        const list = this._callbacks[event];
        if (!list) {
            return;
        }

        const index = list.findIndex((el) => el.callback === callback);
        if (index === -1) {
            return;
        }

        list.splice(index, 1);
        if (!list.length) {
            delete this._callbacks[event];
        }
    }
}
