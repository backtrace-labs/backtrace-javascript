import { AbortController } from '../../src/common/AbortController.js';
import { AbortError } from '../../src/common/AbortError.js';

function createEvent(type: string) {
    if (typeof Event === 'undefined') {
        return {
            type,
            bubbles: false,
            cancelable: false,
        } as Event;
    } else {
        return new Event(type);
    }
}

describe('AbortController', () => {
    it('should abort the signal', () => {
        const controller = new AbortController();
        controller.abort();

        expect(controller.signal.aborted).toBe(true);
    });

    it('should set the abort reason on the signal', () => {
        const controller = new AbortController();
        const reason = new Error();
        controller.abort(reason);

        expect(controller.signal.reason).toBe(reason);
    });

    it('should set the abort reason to AbortError when reason is not specified', () => {
        const controller = new AbortController();
        controller.abort();

        expect(controller.signal.reason).toBeInstanceOf(AbortError);
    });

    it('should call dispatchEvent on signal when aborted', () => {
        const controller = new AbortController();
        const signal = controller.signal;
        const spy = jest.spyOn(signal, 'dispatchEvent');

        controller.abort();
        if (typeof Event !== 'undefined') {
            expect(spy).toBeCalledWith(expect.any(Event));
        } else {
            expect(spy).toBeCalled();
            const value = spy.mock.lastCall?.[0];
            expect(value).toMatchObject({ type: 'abort' });
        }
    });
});

describe('AbortSignal', () => {
    it('should be not aborted on construction', () => {
        const controller = new AbortController();
        const signal = controller.signal;

        expect(signal.aborted).toBe(false);
    });

    it('should abort on dispatching "abort" event', () => {
        const controller = new AbortController();
        const signal = controller.signal;

        signal.dispatchEvent(createEvent('abort'));
        expect(signal.aborted).toBe(true);
    });

    it('should call event listeners on dispatching "abort" event', () => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fn = jest.fn();
        signal.addEventListener('abort', fn);

        signal.dispatchEvent(createEvent('abort'));
        expect(fn).toBeCalled();
    });

    it('should not call event listeners after adding and removing them on dispatching "abort" event', () => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fn = jest.fn();
        signal.addEventListener('abort', fn);
        signal.removeEventListener('abort', fn);

        signal.dispatchEvent(createEvent('abort'));
        expect(fn).not.toBeCalled();
    });

    it('should call onabort on aborting', () => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fn = jest.fn();
        signal.onabort = fn;

        signal.dispatchEvent(createEvent('abort'));

        expect(fn).toBeCalled();
    });

    describe('throwIfAborted', () => {
        it('should not throw when not aborted', () => {
            const controller = new AbortController();
            const signal = controller.signal;

            expect(() => signal.throwIfAborted()).not.toThrow();
        });

        it('should throw after aborted', () => {
            const controller = new AbortController();
            const signal = controller.signal;

            signal.dispatchEvent(createEvent('abort'));

            expect(() => signal.throwIfAborted()).toThrow();
        });

        it('should throw reason when aborted', () => {
            const controller = new AbortController();
            const signal = controller.signal;

            const reason = new Error();
            controller.abort(reason);

            expect(() => signal.throwIfAborted()).toThrow(reason);
        });
    });
});
