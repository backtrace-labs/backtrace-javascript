/* eslint-disable @typescript-eslint/no-explicit-any */
interface EventCallback<A extends any[] = any[]> {
    callback: (...args: A) => unknown;
    once?: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export type EventMap = Record<string, any[]>;

export class Events<E extends EventMap = EventMap> {
    private readonly _callbacks: Partial<Record<keyof E, EventCallback[]>> = {};

    public on<N extends keyof E>(event: N, callback: (...args: E[N]) => unknown): this {
        this.addCallback(event, { callback });
        return this;
    }

    public once<N extends keyof E>(event: N, callback: (...args: E[N]) => unknown): this {
        this.addCallback(event, { callback, once: true });
        return this;
    }

    public off<N extends keyof E>(event: N, callback: (...args: E[N]) => unknown): this {
        this.removeCallback(event, callback);
        return this;
    }

    public emit<N extends keyof E>(event: N, ...args: E[N]): boolean {
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

    private addCallback<A extends unknown[]>(event: keyof E, callback: EventCallback<A>) {
        const list = this._callbacks[event];
        if (list) {
            list.push(callback);
        } else {
            this._callbacks[event] = [callback];
        }
    }

    private removeCallback<A extends unknown[]>(event: keyof E, callback: EventCallback<A>['callback']) {
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
