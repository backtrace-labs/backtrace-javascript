import { Events } from './Events';

class PolyfillAbortSignal implements AbortSignal {
    private readonly _listeners: [EventListenerOrEventListenerObject, (ev: AbortSignalEventMap['abort']) => any][] = [];
    private readonly _events = new Events();
    private _aborted = false;
    private _reason: any = undefined;

    public get aborted() {
        return this._aborted;
    }

    public get reason() {
        return this._reason;
    }

    public onabort: ((this: AbortSignal, ev: Event) => any) | null = null;

    public throwIfAborted(): void {
        throw new Error('Method not implemented.');
    }

    public addEventListener(
        type: 'abort',
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void {
        const fn = (ev: AbortSignalEventMap[typeof type]) => {
            if (typeof listener === 'object') {
                return listener.handleEvent.call(this, ev);
            } else {
                return listener.call(this, ev);
            }
        };

        const { once, signal } = (typeof options === 'object' ? options : {}) as AddEventListenerOptions;
        if (once) {
            this._events.once(type, fn);
        } else {
            this._events.on(type, fn);
        }

        if (signal) {
            const removeFn = () => this.removeEventListener(type, listener);
            signal.addEventListener(type, removeFn, { once: true });
        }

        this._listeners.push([listener, fn]);
    }

    public removeEventListener(type: 'abort', listener: EventListenerOrEventListenerObject): void {
        const listeners = this._listeners.filter((l) => l[0] === listener);
        for (const elem of listeners) {
            this._events.off(type, elem[1]);
            const index = this._listeners.indexOf(elem);
            this._listeners.splice(index, 1);
        }
    }

    public dispatchEvent(event: Event): boolean {
        return this._events.emit('abort', event);
    }

    public _abort(reason: any) {
        const ev = new Event('abort');
        this._aborted = true;
        this._reason = reason;
        this._events.emit('abort', ev);

        if (this.onabort) {
            this.onabort(ev);
        }
    }
}

class PolyfillAbortController implements AbortController {
    public get signal(): AbortSignal {
        return this._signal;
    }

    private readonly _signal: PolyfillAbortSignal;

    abort(reason?: any): void;
    abort(reason?: any): void;
    abort(reason?: unknown): void {
        this._signal._abort(reason);
    }

    constructor() {
        this._signal = new PolyfillAbortSignal();
    }
}

export function createAbortController(): AbortController {
    if (AbortController) {
        return new AbortController();
    } else {
        return new PolyfillAbortController();
    }
}

export function anySignal(...signals: (AbortSignal | undefined)[]): AbortSignal {
    const controller = createAbortController();

    function onAbort() {
        controller.abort();

        // Cleanup
        for (const signal of signals) {
            if (signal) {
                signal.removeEventListener('abort', onAbort);
            }
        }
    }

    for (const signal of signals) {
        if (!signal) {
            continue;
        }

        if (signal.aborted) {
            onAbort();
            break;
        }
        signal.addEventListener('abort', onAbort);
    }

    return controller.signal;
}
