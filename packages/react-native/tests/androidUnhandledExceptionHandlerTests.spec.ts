import type { BacktraceReport } from '@backtrace/sdk-core';
import type { BacktraceClient } from '../src/BacktraceClient';

jest.mock('react-native', () => ({
    NativeModules: {},
    Platform: {
        OS: 'android',
        select: (options: Record<string, unknown>) =>
            options.android !== undefined ? options.android : options.default,
    },
}));

jest.mock('promise/setimmediate/rejection-tracking', () => ({
    enable: jest.fn(),
}));

jest.mock('../src/crashReporter/CrashReporter', () => ({
    CrashReporter: { markFatalError: jest.fn() },
}));

const mockIsNativeBridgeEnabled = jest.fn().mockReturnValue(true);
jest.mock('../src/common/DebuggerHelper', () => ({
    DebuggerHelper: { isNativeBridgeEnabled: () => mockIsNativeBridgeEnabled() },
}));

import { NativeModules } from 'react-native';
import { CrashReporter } from '../src/crashReporter/CrashReporter';

const nativeHandlerMock = {
    start: jest.fn(),
    stop: jest.fn(),
    reportProcessed: jest.fn(),
    markFatalError: jest.fn(),
};

NativeModules.BacktraceAndroidBackgroundUnhandledExceptionHandler = nativeHandlerMock;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AndroidUnhandledExceptionHandler } = require('../src/handlers/android/AndroidUnhandledExceptionHandler');

type NativeExceptionCallback = (classifier: string, message: string, stackTrace: string) => Promise<void>;
type GlobalHandler = (error: Error, fatal?: boolean) => void;

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('AndroidUnhandledExceptionHandler', () => {
    let originalErrorUtils: unknown;
    let previousGlobalHandler: jest.Mock;
    let registeredHandler: GlobalHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        mockIsNativeBridgeEnabled.mockReturnValue(true);
        previousGlobalHandler = jest.fn();

        originalErrorUtils = (global as unknown as { ErrorUtils?: unknown }).ErrorUtils;
        (global as unknown as { ErrorUtils: unknown }).ErrorUtils = {
            getGlobalHandler: () => previousGlobalHandler,
            setGlobalHandler: (fn: GlobalHandler) => {
                registeredHandler = fn;
            },
        };
    });

    afterEach(() => {
        (global as unknown as { ErrorUtils: unknown }).ErrorUtils = originalErrorUtils;
    });

    function captureNativeCallback(client: BacktraceClient): NativeExceptionCallback {
        new AndroidUnhandledExceptionHandler().captureManagedErrors(client);
        return nativeHandlerMock.start.mock.calls[0][0];
    }

    it('Should signal reportProcessed only after the report send resolves', async () => {
        let resolveSend!: () => void;
        const sendMock = jest.fn().mockReturnValue(
            new Promise<void>((resolve) => {
                resolveSend = resolve;
            }),
        );
        const callback = captureNativeCallback({ send: sendMock } as unknown as BacktraceClient);

        const callbackPromise = callback('java.lang.RuntimeException', 'boom', 'a.b(C.java:1)');

        expect(sendMock).toHaveBeenCalledTimes(1);
        expect(nativeHandlerMock.reportProcessed).not.toHaveBeenCalled();

        resolveSend();
        await callbackPromise;

        expect(nativeHandlerMock.reportProcessed).toHaveBeenCalledTimes(1);
    });

    it('Should signal reportProcessed before the send settles for a JavascriptException', async () => {
        const sendMock = jest.fn().mockReturnValue(new Promise<void>(() => undefined));
        const callback = captureNativeCallback({ send: sendMock } as unknown as BacktraceClient);

        void callback('com.facebook.react.common.JavascriptException', 'Error: boom', 'a.b(C.java:1)');

        expect(sendMock).toHaveBeenCalledTimes(1);
        expect(nativeHandlerMock.reportProcessed).toHaveBeenCalledTimes(1);
    });

    it('Should signal reportProcessed when the send fails', async () => {
        const sendMock = jest.fn().mockRejectedValue(new Error('offline'));
        const callback = captureNativeCallback({ send: sendMock } as unknown as BacktraceClient);

        await callback('java.lang.RuntimeException', 'boom', 'a.b(C.java:1)');

        expect(nativeHandlerMock.reportProcessed).toHaveBeenCalledTimes(1);
    });

    it("Should send the exception as a report tagged with error.type 'Unhandled exception'", async () => {
        const sendMock = jest.fn().mockResolvedValue(undefined);
        const callback = captureNativeCallback({ send: sendMock } as unknown as BacktraceClient);

        await callback('java.lang.IllegalStateException', 'boom', 'a.b(C.java:1)');

        const report = sendMock.mock.calls[0][0] as BacktraceReport;
        expect(report.attributes['error.type']).toBe('Unhandled exception');
    });

    it('Should not start the native handler when the native bridge is unavailable', () => {
        mockIsNativeBridgeEnabled.mockReturnValue(false);

        new AndroidUnhandledExceptionHandler().captureManagedErrors({ send: jest.fn() } as unknown as BacktraceClient);

        expect(nativeHandlerMock.start).not.toHaveBeenCalled();
    });

    it('Should mark the fatal error on the Java handler, not the crash reporter, before forwarding it', async () => {
        const sendMock = jest.fn().mockResolvedValue(undefined);
        new AndroidUnhandledExceptionHandler().captureManagedErrors({ send: sendMock } as unknown as BacktraceClient);
        const error = new Error('boom');

        registeredHandler(error, true);
        await flush();

        expect(nativeHandlerMock.markFatalError).toHaveBeenCalledTimes(1);
        expect(CrashReporter.markFatalError).not.toHaveBeenCalled();
        expect(previousGlobalHandler).toHaveBeenCalledWith(error, true);
        expect(nativeHandlerMock.markFatalError.mock.invocationCallOrder[0]).toBeLessThan(
            previousGlobalHandler.mock.invocationCallOrder[0],
        );
    });

    it('Should forward a fatal error when the Java handler module has no markFatalError', async () => {
        const { markFatalError, ...olderModule } = nativeHandlerMock;
        NativeModules.BacktraceAndroidBackgroundUnhandledExceptionHandler = olderModule;
        try {
            new AndroidUnhandledExceptionHandler().captureManagedErrors({
                send: jest.fn().mockResolvedValue(undefined),
            } as unknown as BacktraceClient);
            const error = new Error('boom');

            registeredHandler(error, true);
            await flush();

            expect(markFatalError).not.toHaveBeenCalled();
            expect(previousGlobalHandler).toHaveBeenCalledWith(error, true);
        } finally {
            NativeModules.BacktraceAndroidBackgroundUnhandledExceptionHandler = nativeHandlerMock;
        }
    });

    it('Should stop the native handler on dispose', () => {
        const handler = new AndroidUnhandledExceptionHandler();
        handler.captureManagedErrors({ send: jest.fn() } as unknown as BacktraceClient);

        handler.dispose();

        expect(nativeHandlerMock.stop).toHaveBeenCalledTimes(1);
    });
});
