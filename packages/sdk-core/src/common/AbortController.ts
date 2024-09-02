import { AbortError } from './AbortError.js';
import { Events } from './Events.js';
import { OriginalAbortController, OriginalAbortSignal } from './abortInterfaces.js';

/**
 * Copied and repurposed from https://github.com/mo/abortcontroller-polyfill/blob/master/src/abortcontroller.js
 */
class Emitter {
    private readonly _listeners: Record<
        string,
        {
            listener: EventListenerOrEventListenerObject;
            callback: (ev: Event) => unknown;
            options?: boolean | AddEventListenerOptions;
        }[]
    > = {};

    private readonly _events = new Events();

    public addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ) {
        if (!(type in this._listeners)) {
            this._listeners[type] = [];
        }

        const callback = (ev: Event) => {
            if (typeof listener === 'object') {
                return listener.handleEvent.call(this, ev);
            } else {
                return listener.call(this, ev);
            }
        };

        const { once, signal } = (typeof options === 'object' ? options : {}) as AddEventListenerOptions;
        if (once) {
            this._events.once(type, callback);
        } else {
            this._events.on(type, callback);
        }

        if (signal) {
            const removeFn = () => this.removeEventListener(type, listener);
            signal.addEventListener(type, removeFn, { once: true });
        }

        this._listeners[type].push({ callback, listener, options });
    }

    public removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        if (!(type in this._listeners)) {
            return;
        }

        const allListeners = this._listeners[type];
        const listeners = allListeners.filter((l) => l.listener === listener);
        for (const elem of listeners) {
            this._events.off(type, elem.callback);
            const index = allListeners.indexOf(elem);
            allListeners.splice(index, 1);
        }
    }

    public dispatchEvent(event: Event) {
        this._events.emit(event.type, event);
        return !event.defaultPrevented;
    }
}

/**
 * Copied and repurposed from https://github.com/mo/abortcontroller-polyfill/blob/master/src/abortcontroller.js
 */
export class AbortSignal extends Emitter implements OriginalAbortSignal {
    public aborted = false;
    public onabort: ((this: OriginalAbortSignal, ev: Event) => unknown) | null = null;
    public reason: unknown;

    constructor() {
        super();

        // Compared to assignment, Object.defineProperty makes properties non-enumerable by default and
        // we want Object.keys(new AbortController().signal) to be [] for compat with the native impl
        Object.defineProperty(this, 'aborted', { writable: true, configurable: true, enumerable: false });
        Object.defineProperty(this, 'onabort', { writable: true, configurable: true, enumerable: false });
        Object.defineProperty(this, 'reason', { writable: true, configurable: true, enumerable: false });
    }

    public toString() {
        return '[object AbortSignal]';
    }

    public throwIfAborted(): void {
        if (this.aborted) {
            throw this.reason;
        }
    }

    public dispatchEvent(event: Event) {
        if (event.type === 'abort') {
            this.aborted = true;
            if (typeof this.onabort === 'function') {
                this.onabort.call(this, event);
            }
        }

        return super.dispatchEvent(event);
    }

    public any(signals: Iterable<globalThis.AbortSignal>): globalThis.AbortSignal {
        return anySignal(...signals);
    }
}

/**
 * Copied and repurposed from https://github.com/mo/abortcontroller-polyfill/blob/master/src/abortcontroller.js
 */
export class AbortController implements OriginalAbortController {
    public readonly signal: OriginalAbortSignal;

    constructor() {
        // Compared to assignment, Object.defineProperty makes properties non-enumerable by default and
        // we want Object.keys(new AbortController()) to be [] for compat with the native impl
        this.signal = new AbortSignal();
        Object.defineProperty(this, 'signal', { configurable: true, enumerable: false });
    }

    public abort(reason?: unknown) {
        let event: Event;
        try {
            event = new Event('abort');
        } catch (e) {
            if (typeof document !== 'undefined') {
                interface IE8Document extends Document {
                    createEventObject?(): Event;
                }

                const ie8Document: IE8Document = document;
                if (!ie8Document.createEvent && ie8Document.createEventObject) {
                    // For Internet Explorer 8:
                    event = ie8Document.createEventObject();
                    (event as { type: string }).type = 'abort';
                } else {
                    // For Internet Explorer 11:
                    event = document.createEvent('Event');
                    event.initEvent('abort', false, false);
                }
            } else {
                // Fallback where document isn't available:
                event = {
                    type: 'abort',
                    bubbles: false,
                    cancelable: false,
                } as Event;
            }
        }

        let signalReason = reason;
        if (signalReason === undefined) {
            if (typeof document === 'undefined') {
                signalReason = new AbortError('This operation was aborted');
            } else {
                try {
                    signalReason = new DOMException('signal is aborted without reason');
                } catch (err) {
                    // IE 11 does not support calling the DOMException constructor, use a
                    // regular error object on it instead.
                    signalReason = new AbortError('This operation was aborted');
                }
            }
        }

        (this.signal as { reason: unknown }).reason = signalReason;
        this.signal.dispatchEvent(event);
    }

    public toString() {
        return '[object AbortController]';
    }
}

/**
 * Copied and repurposed from https://github.com/mo/abortcontroller-polyfill/blob/master/src/abortcontroller.js
 */
if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
    type WithToStringTag<T> = Record<typeof Symbol.toStringTag, string> & T;

    // These are necessary to make sure that we get correct output for:
    // Object.prototype.toString.call(new AbortController())
    (AbortController.prototype as WithToStringTag<AbortController>)[Symbol.toStringTag] = 'AbortController';
    (AbortSignal.prototype as WithToStringTag<AbortSignal>)[Symbol.toStringTag] = 'AbortSignal';
}

/**
 * Creates a new abort controller.
 *
 * If the AbortController is not available, a polyfill is used.
 * @returns
 */
export function createAbortController(): OriginalAbortController {
    if (OriginalAbortController) {
        return new OriginalAbortController();
    } else {
        return new AbortController();
    }
}

interface DisposableAbortSignal extends OriginalAbortSignal {
    dispose(): void;
}

export function anySignal(...signals: (OriginalAbortSignal | undefined)[]): DisposableAbortSignal {
    const controller = createAbortController();

    function cleanup() {
        // Cleanup
        for (const signal of signals) {
            if (signal) {
                signal.removeEventListener('abort', onAbort);
            }
        }
    }

    function onAbort() {
        controller.abort();
        cleanup();
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

    (controller.signal as DisposableAbortSignal).dispose = cleanup;
    return controller.signal as DisposableAbortSignal;
}
