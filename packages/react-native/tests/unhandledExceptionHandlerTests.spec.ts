import { BacktraceReport } from '@backtrace/sdk-core';
import type { BacktraceClient } from '../src/BacktraceClient';

jest.mock('promise/setimmediate/rejection-tracking', () => ({
    enable: jest.fn(),
}));

jest.mock('../src/crashReporter/CrashReporter', () => ({
    CrashReporter: { markFatalError: jest.fn() },
}));

const mockHermesInternal: {
    enablePromiseRejectionTracker?: jest.Mock;
    hasPromise?: jest.Mock;
} = {};

jest.mock('../src/common/hermesHelper', () => ({
    hermes: () => (mockHermesInternal.enablePromiseRejectionTracker ? mockHermesInternal : undefined),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const rejectionTracking = require('promise/setimmediate/rejection-tracking');

import { AppState } from 'react-native';
import { CrashReporter } from '../src/crashReporter/CrashReporter';
import { UnhandledExceptionHandler } from '../src/handlers/UnhandledExceptionHandler';

const markFatalErrorMock = CrashReporter.markFatalError as jest.Mock;

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
const flushMicrotasks = async () => {
    for (let i = 0; i < 10; i++) {
        await Promise.resolve();
    }
};

describe('UnhandledExceptionHandler labeling', () => {
    let sendMock: jest.Mock;
    let client: BacktraceClient;
    let handler: UnhandledExceptionHandler;

    beforeEach(() => {
        rejectionTracking.enable.mockClear();
        delete mockHermesInternal.enablePromiseRejectionTracker;
        delete mockHermesInternal.hasPromise;
        sendMock = jest.fn();
        client = { send: sendMock } as unknown as BacktraceClient;
        handler = new UnhandledExceptionHandler();
    });

    it("Should tag captured unhandled promise rejections (non-Hermes) with error.type 'Unhandled rejection'", () => {
        handler.captureUnhandledPromiseRejections(client);

        expect(rejectionTracking.enable).toHaveBeenCalled();
        const options = rejectionTracking.enable.mock.calls[0][0];
        options.onUnhandled(42, new Error('Failed to fetch'));

        expect(sendMock).toHaveBeenCalled();
        const report = sendMock.mock.calls[0][0] as BacktraceReport;
        expect(report.attributes['error.type']).toBe('Unhandled rejection');
        expect(report.attributes['unhandledPromiseRejectionId']).toBe(42);
        expect(report.classifiers).toContain('UnhandledPromiseRejection');
    });

    it("Should tag captured unhandled promise rejections (Hermes) with error.type 'Unhandled rejection'", () => {
        mockHermesInternal.hasPromise = jest.fn().mockReturnValue(true);
        mockHermesInternal.enablePromiseRejectionTracker = jest.fn();

        handler.captureUnhandledPromiseRejections(client);

        expect(mockHermesInternal.enablePromiseRejectionTracker).toHaveBeenCalled();
        expect(rejectionTracking.enable).not.toHaveBeenCalled();
        const options = mockHermesInternal.enablePromiseRejectionTracker.mock.calls[0][0];
        options.onUnhandled(99, new Error('Failed to fetch'));

        expect(sendMock).toHaveBeenCalled();
        const report = sendMock.mock.calls[0][0] as BacktraceReport;
        expect(report.attributes['error.type']).toBe('Unhandled rejection');
        expect(report.attributes['unhandledPromiseRejectionId']).toBe(99);
        expect(report.classifiers).toContain('UnhandledPromiseRejection');
    });
});

describe('UnhandledExceptionHandler managed errors', () => {
    let sendMock: jest.Mock;
    let client: BacktraceClient;
    let handler: UnhandledExceptionHandler;
    let registeredHandler: (error: Error, fatal?: boolean) => void;
    let previousGlobalHandler: jest.Mock;
    let originalErrorUtils: unknown;
    let originalDev: PropertyDescriptor | undefined;

    beforeEach(() => {
        originalDev = Object.getOwnPropertyDescriptor(globalThis, '__DEV__');
        Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
        markFatalErrorMock.mockClear();
        sendMock = jest.fn();
        client = { send: sendMock } as unknown as BacktraceClient;
        handler = new UnhandledExceptionHandler();
        previousGlobalHandler = jest.fn();

        originalErrorUtils = (global as unknown as { ErrorUtils?: unknown }).ErrorUtils;
        (global as unknown as { ErrorUtils: unknown }).ErrorUtils = {
            getGlobalHandler: () => previousGlobalHandler,
            setGlobalHandler: (fn: typeof registeredHandler) => {
                registeredHandler = fn;
            },
        };

        handler.captureManagedErrors(client);
    });

    afterEach(() => {
        (global as unknown as { ErrorUtils: unknown }).ErrorUtils = originalErrorUtils;
        if (originalDev) {
            Object.defineProperty(globalThis, '__DEV__', originalDev);
        } else {
            Reflect.deleteProperty(globalThis, '__DEV__');
        }
        jest.restoreAllMocks();
    });

    it('Should forward a fatal unhandled error only after the report settles, marking it for the native reporter first', async () => {
        let resolveSend!: () => void;
        sendMock.mockReturnValue(
            new Promise<void>((resolve) => {
                resolveSend = resolve;
            }),
        );
        const error = new Error('boom');

        registeredHandler(error, true);

        expect(sendMock).toHaveBeenCalledWith(error, { 'error.type': 'Unhandled exception', fatal: true });
        expect(markFatalErrorMock).not.toHaveBeenCalled();
        expect(previousGlobalHandler).not.toHaveBeenCalled();

        resolveSend();
        await flush();

        expect(markFatalErrorMock).toHaveBeenCalledTimes(1);
        expect(previousGlobalHandler).toHaveBeenCalledWith(error, true);
        expect(markFatalErrorMock.mock.invocationCallOrder[0]).toBeLessThan(
            previousGlobalHandler.mock.invocationCallOrder[0],
        );
    });

    it('Should forward a fatal unhandled error when the report fails', async () => {
        sendMock.mockRejectedValue(new Error('offline'));
        const error = new Error('boom');

        registeredHandler(error, true);
        await flush();

        expect(markFatalErrorMock).toHaveBeenCalledTimes(1);
        expect(previousGlobalHandler).toHaveBeenCalledTimes(1);
        expect(previousGlobalHandler).toHaveBeenCalledWith(error, true);
    });

    it('Should forward a fatal unhandled error after 5 seconds when the report never settles', async () => {
        jest.useFakeTimers();
        try {
            sendMock.mockReturnValue(new Promise<void>(() => undefined));
            const error = new Error('boom');

            registeredHandler(error, true);
            await flushMicrotasks();
            expect(previousGlobalHandler).not.toHaveBeenCalled();

            jest.advanceTimersByTime(4999);
            await flushMicrotasks();
            expect(previousGlobalHandler).not.toHaveBeenCalled();

            jest.advanceTimersByTime(1);
            await flushMicrotasks();
            expect(markFatalErrorMock).toHaveBeenCalledTimes(1);
            expect(previousGlobalHandler).toHaveBeenCalledWith(error, true);
        } finally {
            jest.useRealTimers();
        }
    });

    it('Should forward a fatal error at once and mark it when the app is in the background', () => {
        const appState = AppState as unknown as { currentState: unknown };
        const original = appState.currentState;
        appState.currentState = 'background';
        try {
            sendMock.mockReturnValue(new Promise<void>(() => undefined));
            const error = new Error('boom');

            registeredHandler(error, true);

            expect(sendMock).toHaveBeenCalledTimes(1);
            expect(markFatalErrorMock).toHaveBeenCalledTimes(1);
            expect(previousGlobalHandler).toHaveBeenCalledWith(error, true);
        } finally {
            appState.currentState = original;
        }
    });

    it('Should forward a pending fatal error once the app goes to the background', async () => {
        let onChange!: (state: string) => void;
        jest.spyOn(AppState, 'addEventListener').mockImplementation(((
            _type: string,
            listener: (state: string) => void,
        ) => {
            onChange = listener;
            return { remove: jest.fn() };
        }) as unknown as typeof AppState.addEventListener);
        sendMock.mockReturnValue(new Promise<void>(() => undefined));
        const error = new Error('boom');

        registeredHandler(error, true);
        await flush();
        expect(previousGlobalHandler).not.toHaveBeenCalled();

        onChange('inactive');
        await flush();
        expect(previousGlobalHandler).not.toHaveBeenCalled();

        onChange('background');
        await flush();

        expect(markFatalErrorMock).toHaveBeenCalledTimes(1);
        expect(previousGlobalHandler).toHaveBeenCalledWith(error, true);
        expect(markFatalErrorMock.mock.invocationCallOrder[0]).toBeLessThan(
            previousGlobalHandler.mock.invocationCallOrder[0],
        );
    });

    it('Should stop listening for the background once the report settles', async () => {
        const remove = jest.fn();
        jest.spyOn(AppState, 'addEventListener').mockReturnValue({
            remove,
        } as unknown as ReturnType<typeof AppState.addEventListener>);
        sendMock.mockResolvedValue(undefined);

        registeredHandler(new Error('boom'), true);
        await flush();

        expect(previousGlobalHandler).toHaveBeenCalledTimes(1);
        expect(remove).toHaveBeenCalled();
    });

    it('Should forward a fatal error at once without marking it in a debug build', () => {
        Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: true });
        sendMock.mockReturnValue(new Promise<void>(() => undefined));
        const error = new Error('boom');

        registeredHandler(error, true);

        expect(sendMock).toHaveBeenCalledWith(error, { 'error.type': 'Unhandled exception', fatal: true });
        expect(markFatalErrorMock).not.toHaveBeenCalled();
        expect(previousGlobalHandler).toHaveBeenCalledWith(error, true);
    });

    it('Should report a second fatal error while the first is pending and forward both in order', async () => {
        let resolveSend!: () => void;
        sendMock.mockReturnValue(
            new Promise<void>((resolve) => {
                resolveSend = resolve;
            }),
        );
        const first = new Error('first');
        const second = new Error('second');

        registeredHandler(first, true);
        registeredHandler(second, true);

        expect(sendMock).toHaveBeenCalledTimes(2);
        expect(previousGlobalHandler).not.toHaveBeenCalled();

        resolveSend();
        await flush();

        expect(previousGlobalHandler.mock.calls).toEqual([
            [first, true],
            [second, true],
        ]);
    });

    it('Should report fatal errors again once the pending one is forwarded', async () => {
        sendMock.mockResolvedValue(undefined);

        registeredHandler(new Error('first'), true);
        await flush();
        registeredHandler(new Error('later'), true);
        await flush();

        expect(sendMock).toHaveBeenCalledTimes(2);
        expect(previousGlobalHandler).toHaveBeenCalledTimes(2);
    });

    it('Should keep reporting non-fatal errors while a fatal error is pending', async () => {
        sendMock.mockReturnValue(new Promise<void>(() => undefined));
        const fatal = new Error('fatal');
        const nonFatal = new Error('warning');

        registeredHandler(fatal, true);
        registeredHandler(nonFatal, false);

        expect(sendMock).toHaveBeenCalledTimes(2);
        expect(previousGlobalHandler).toHaveBeenCalledTimes(1);
        expect(previousGlobalHandler).toHaveBeenCalledWith(nonFatal, false);
    });

    it('Should forward a non-fatal unhandled error synchronously without marking it', () => {
        const error = new Error('boom');
        registeredHandler(error, false);

        expect(sendMock).toHaveBeenCalledWith(error, { 'error.type': 'Unhandled exception', fatal: false });
        expect(markFatalErrorMock).not.toHaveBeenCalled();
        expect(previousGlobalHandler).toHaveBeenCalledWith(error, false);
    });
});
