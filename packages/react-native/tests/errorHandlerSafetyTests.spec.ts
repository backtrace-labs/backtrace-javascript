import { BacktraceReport } from '@backtrace/sdk-core';
import type { BacktraceClient } from '../src/BacktraceClient';

jest.mock('promise/setimmediate/rejection-tracking', () => ({
    enable: jest.fn(),
    disable: jest.fn(),
}));

jest.mock('../src/common/hermesHelper', () => ({
    hermes: jest.fn(),
}));

jest.mock('../src/crashReporter/CrashReporter', () => ({
    CrashReporter: { markFatalError: jest.fn() },
}));

import { hermes } from '../src/common/hermesHelper';
import { CrashReporter } from '../src/crashReporter/CrashReporter';
import { UnhandledExceptionHandler } from '../src/handlers/UnhandledExceptionHandler';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const rejectionTracking = require('promise/setimmediate/rejection-tracking') as {
    enable: jest.Mock;
    disable: jest.Mock;
};

type Handler = (error: Error, fatal?: boolean) => void;
type RejectionOptions = {
    allRejections: boolean;
    onUnhandled: (id: number, rejection?: unknown) => void;
    onHandled?: (id: number) => void;
};

describe('UnhandledExceptionHandler safety', () => {
    let current: Handler;
    let previous: jest.Mock;
    let setGlobalHandler: jest.Mock;
    let send: jest.Mock;
    let client: BacktraceClient;
    let handler: UnhandledExceptionHandler;
    let originalErrorUtils: PropertyDescriptor | undefined;
    let originalDev: PropertyDescriptor | undefined;
    let warn: jest.SpyInstance;

    beforeEach(() => {
        jest.resetAllMocks();
        previous = jest.fn();
        current = previous;
        send = jest.fn().mockResolvedValue(undefined);
        client = { send } as unknown as BacktraceClient;
        handler = new UnhandledExceptionHandler();
        originalErrorUtils = Object.getOwnPropertyDescriptor(globalThis, 'ErrorUtils');
        originalDev = Object.getOwnPropertyDescriptor(globalThis, '__DEV__');
        setGlobalHandler = jest.fn((next: Handler) => {
            current = next;
        });
        Object.defineProperty(globalThis, 'ErrorUtils', {
            configurable: true,
            value: { getGlobalHandler: () => current, setGlobalHandler },
        });
        Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
        warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        handler.dispose();
        if (originalErrorUtils) {
            Object.defineProperty(globalThis, 'ErrorUtils', originalErrorUtils);
        } else {
            Reflect.deleteProperty(globalThis, 'ErrorUtils');
        }
        if (originalDev) {
            Object.defineProperty(globalThis, '__DEV__', originalDev);
        } else {
            Reflect.deleteProperty(globalThis, '__DEV__');
        }
        jest.restoreAllMocks();
    });

    describe('managed errors', () => {
        it('delegates exactly once when synchronous reporting fails and preserves the failure warning', () => {
            send.mockImplementation(() => {
                throw new Error('attachment construction failed');
            });
            handler.captureManagedErrors(client);
            const error = new Error('application failure');
            expect(() => current(error, true)).not.toThrow();
            expect(previous).toHaveBeenCalledTimes(1);
            expect(previous).toHaveBeenCalledWith(error, true);
            expect(CrashReporter.markFatalError).not.toHaveBeenCalled();
            expect(warn).toHaveBeenCalledWith('Backtrace: failed to report an unhandled error (Error)');
        });

        it('observes asynchronous failures without delaying delegation or fatal marking', async () => {
            send.mockRejectedValue(new Error('transport failure'));
            handler.captureManagedErrors(client);
            const error = new Error('application failure');
            current(error, true);
            expect(previous).toHaveBeenCalledTimes(1);
            expect(previous).toHaveBeenCalledWith(error, true);
            expect(CrashReporter.markFatalError).toHaveBeenCalledTimes(1);
            // A rejected submission must be handled in the same turn,
            // even if the process remains alive after the application's handler returns.
            await new Promise((resolve) => setImmediate(resolve));
        });

        it('delegates even when native fatal marking fails', () => {
            (CrashReporter.markFatalError as jest.Mock).mockImplementation(() => {
                throw new Error('native marker failed');
            });
            handler.captureManagedErrors(client);
            const error = new Error('application failure');
            expect(() => current(error, true)).not.toThrow();
            expect(previous).toHaveBeenCalledTimes(1);
            expect(previous).toHaveBeenCalledWith(error, true);
        });

        it('does not swallow exceptions from the previous global handler', () => {
            const originalFailure = new Error('previous handler failure');
            previous.mockImplementation(() => {
                throw originalFailure;
            });
            handler.captureManagedErrors(client);
            expect(() => current(new Error('application failure'), false)).toThrow(originalFailure);
            expect(previous).toHaveBeenCalledTimes(1);
        });

        it('delegates reentrant errors without recursively reporting them and resumes reporting later errors', () => {
            const nested = new Error('reporting failure');
            send.mockImplementationOnce(() => current(nested, false));
            handler.captureManagedErrors(client);
            const original = new Error('application failure');
            current(original, false);
            expect(send).toHaveBeenCalledTimes(1);
            expect(previous.mock.calls).toEqual([
                [nested, false],
                [original, false],
            ]);
            current(new Error('later failure'), false);
            expect(send).toHaveBeenCalledTimes(2);
        });

        it('still delegates when reporting and diagnostic logging both throw', () => {
            send.mockImplementation(() => {
                throw new Error('report construction failure');
            });
            warn.mockImplementation(() => {
                throw new Error('logger failure');
            });
            handler.captureManagedErrors(client);
            const error = new Error('application failure');
            expect(() => current(error, false)).not.toThrow();
            expect(previous).toHaveBeenCalledTimes(1);
            expect(previous).toHaveBeenCalledWith(error, false);
        });

        it('does not recursively report errors generated by an instrumented warning logger', () => {
            send.mockImplementation(() => {
                throw new Error('report construction failure');
            });
            const loggingError = new Error('logger failure');
            warn.mockImplementation(() => current(loggingError, false));
            handler.captureManagedErrors(client);
            const original = new Error('application failure');
            current(original, false);
            expect(send).toHaveBeenCalledTimes(1);
            expect(warn).toHaveBeenCalledTimes(1);
            expect(previous.mock.calls).toEqual([
                [loggingError, false],
                [original, false],
            ]);
        });

        it('registers only once even when capture is called again with another client', () => {
            handler.captureManagedErrors(client);
            const installed = current;
            const otherSend = jest.fn();
            handler.captureManagedErrors({ send: otherSend } as unknown as BacktraceClient);
            expect(current).toBe(installed);
            expect(setGlobalHandler).toHaveBeenCalledTimes(1);
            current(new Error('application failure'));
            expect(send).toHaveBeenCalledTimes(1);
            expect(otherSend).not.toHaveBeenCalled();
        });

        it('restores its previous handler on disposal and leaves retained wrappers forwarding-only', () => {
            handler.captureManagedErrors(client);
            const retained = current;
            handler.dispose();
            expect(current).toBe(previous);
            const error = new Error('after disposal');
            retained(error, true);
            expect(send).not.toHaveBeenCalled();
            expect(CrashReporter.markFatalError).not.toHaveBeenCalled();
            expect(previous).toHaveBeenCalledWith(error, true);
            handler.dispose();
            expect(setGlobalHandler).toHaveBeenCalledTimes(2);
        });

        it('preserves later SDK wrappers and forwards through its disposed wrapper', () => {
            handler.captureManagedErrors(client);
            const retained = current;
            const later = jest.fn((error: Error, fatal?: boolean) => retained(error, fatal));
            ErrorUtils.setGlobalHandler(later);
            handler.dispose();
            expect(current).toBe(later);
            const error = new Error('after disposal');
            current(error, false);
            expect(later).toHaveBeenCalledWith(error, false);
            expect(previous).toHaveBeenCalledWith(error, false);
            expect(send).not.toHaveBeenCalled();
        });

        it('does not register after disposal', () => {
            handler.dispose();
            handler.captureManagedErrors(client);
            handler.captureUnhandledPromiseRejections(client);
            expect(setGlobalHandler).not.toHaveBeenCalled();
            expect(rejectionTracking.enable).not.toHaveBeenCalled();
        });

        it('can retry registration after ErrorUtils rejects it', () => {
            setGlobalHandler.mockImplementationOnce(() => {
                throw new Error('cannot install handler');
            });
            expect(() => handler.captureManagedErrors(client)).toThrow('cannot install handler');
            handler.captureManagedErrors(client);
            current(new Error('application failure'));
            expect(send).toHaveBeenCalledTimes(1);
        });
    });

    describe.each(['Hermes', 'fallback'])('%s promise rejections', (engine) => {
        let tracker: jest.Mock;
        let options: RejectionOptions;

        beforeEach(() => {
            tracker = engine === 'Hermes' ? jest.fn() : rejectionTracking.enable;
            if (engine === 'Hermes') {
                (hermes as jest.Mock).mockReturnValue({
                    hasPromise: () => true,
                    enablePromiseRejectionTracker: tracker,
                });
            }
            handler.captureUnhandledPromiseRejections(client);
            options = tracker.mock.calls[0][0];
        });

        it('preserves error identity, classification, and rejection id', () => {
            const error = new Error('rejected');
            options.onUnhandled(42, error);
            const report = send.mock.calls[0][0] as BacktraceReport;
            expect(report.data).toBe(error);
            expect(report.attributes['error.type']).toBe('Unhandled rejection');
            expect(report.attributes['unhandledPromiseRejectionId']).toBe(42);
            expect(report.classifiers).toContain('UnhandledPromiseRejection');
            expect(report.skipFrames).toBe(0);
            expect(options.allRejections).toBe(true);
        });

        it.each([
            ['string', 'rejected', 'rejected'],
            ['number', 42, '42'],
            ['boolean', false, 'false'],
            ['null', null, 'null'],
            ['undefined', undefined, 'Unknown'],
            ['symbol', Symbol('reason'), 'Symbol(reason)'],
            ['object', { reason: 'bad request' }, 'bad request'],
        ])('reports %s rejection values', (_label, value, expected) => {
            expect(() => options.onUnhandled(7, value)).not.toThrow();
            expect(send).toHaveBeenCalledTimes(1);
            const report = send.mock.calls[0][0] as BacktraceReport;
            expect(report.data).toEqual(expect.stringContaining(expected as string));
            // BacktraceReport adds the constructor frame to the helper/callback frames.
            expect(report.skipFrames).toBe(3);
        });

        it('reports circular objects and objects with throwing formatters safely', () => {
            const circular: { self?: unknown } = {};
            circular.self = circular;
            options.onUnhandled(1, circular);
            expect((send.mock.calls[0][0] as BacktraceReport).data).toContain('[Circular]');
            options.onUnhandled(2, {
                toJSON() {
                    throw new Error('formatter failure');
                },
            });
            expect((send.mock.calls[1][0] as BacktraceReport).data).toBe('<unformattable rejection>');
        });

        it('handles reporting and logging failures without throwing', () => {
            send.mockImplementation(() => {
                throw new Error('report construction failure');
            });
            warn.mockImplementation(() => {
                throw new Error('logger failure');
            });
            expect(() => options.onUnhandled(1, new Error('rejected'))).not.toThrow();
            expect(send).toHaveBeenCalledTimes(1);
        });

        it('observes rejected reporting promises', async () => {
            send.mockRejectedValue(new Error('transport failure'));
            options.onUnhandled(1, new Error('rejected'));
            expect(send).toHaveBeenCalledTimes(1);
            await new Promise((resolve) => setImmediate(resolve));
        });

        it('does not recursively report rejection callbacks invoked during send', () => {
            send.mockImplementationOnce(() => options.onUnhandled(2, new Error('nested rejection')));
            options.onUnhandled(1, new Error('rejected'));
            expect(send).toHaveBeenCalledTimes(1);
            options.onUnhandled(3, new Error('later rejection'));
            expect(send).toHaveBeenCalledTimes(2);
        });

        it('does not register again or disable another tracker during disposal', () => {
            handler.captureUnhandledPromiseRejections(client);
            expect(tracker).toHaveBeenCalledTimes(1);
            handler.dispose();
            options.onUnhandled(1, new Error('after disposal'));
            expect(send).not.toHaveBeenCalled();
            expect(rejectionTracking.disable).not.toHaveBeenCalled();
            expect(tracker).toHaveBeenCalledTimes(1);
        });
    });

    it('allows retrying promise tracker installation after failure', () => {
        rejectionTracking.enable.mockImplementationOnce(() => {
            throw new Error('tracker unavailable');
        });
        expect(() => handler.captureUnhandledPromiseRejections(client)).toThrow('tracker unavailable');
        handler.captureUnhandledPromiseRejections(client);
        expect(rejectionTracking.enable).toHaveBeenCalledTimes(2);
        rejectionTracking.enable.mock.calls[1][0].onUnhandled(1, 'rejected');
        expect(send).toHaveBeenCalledTimes(1);
    });

    it('uses the fallback when Hermes does not supply native promises', () => {
        const hermesTracker = jest.fn();
        (hermes as jest.Mock).mockReturnValue({
            hasPromise: () => false,
            enablePromiseRejectionTracker: hermesTracker,
        });
        handler.captureUnhandledPromiseRejections(client);
        expect(hermesTracker).not.toHaveBeenCalled();
        expect(rejectionTracking.enable).toHaveBeenCalledTimes(1);
    });

    describe('fallback development warnings', () => {
        let options: RejectionOptions;

        beforeEach(() => {
            Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: true });
            handler.captureUnhandledPromiseRejections(client);
            options = rejectionTracking.enable.mock.calls[0][0];
        });

        it('preserves readable Error stacks and handled-rejection warnings', () => {
            const error = new Error('rejected');
            options.onUnhandled(2, error);
            expect(warn).toHaveBeenCalledWith(
                `Possible Unhandled Promise Rejection (id: 2):\nError: rejected\n${error.stack}`,
            );
            options.onHandled?.(2);
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('Promise Rejection Handled (id: 2)'));
        });

        it('formats arbitrary rejection values and keeps warnings after disposal', () => {
            handler.dispose();
            options.onUnhandled(2, { reason: 'rejected' });
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('rejected'));
            expect(send).not.toHaveBeenCalled();
        });

        it('does not throw for errors with throwing stack getters or an instrumented console', () => {
            const error = new Error('rejected');
            Object.defineProperty(error, 'stack', {
                get() {
                    throw new Error('stack getter failed');
                },
            });
            expect(() => options.onUnhandled(1, error)).not.toThrow();
            warn.mockImplementation(() => {
                throw new Error('console failure');
            });
            expect(() => options.onUnhandled(2, 'rejected')).not.toThrow();
            expect(() => options.onHandled?.(2)).not.toThrow();
        });

        it('does not recurse when the warning logger invokes rejection callbacks', () => {
            warn.mockImplementation(() => options.onUnhandled(2, 'logger rejection'));
            expect(() => options.onUnhandled(1, 'rejected')).not.toThrow();
            expect(warn).toHaveBeenCalledTimes(1);
        });

        it('omits React Native warnings in production', () => {
            Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
            options.onUnhandled(1, 'rejected');
            options.onHandled?.(1);
            expect(warn).not.toHaveBeenCalled();
        });
    });
});
