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

const nativeHandlerMock = {
    start: jest.fn(),
    stop: jest.fn(),
    reportProcessed: jest.fn(),
};

NativeModules.BacktraceAndroidBackgroundUnhandledExceptionHandler = nativeHandlerMock;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AndroidUnhandledExceptionHandler } = require('../src/handlers/android/AndroidUnhandledExceptionHandler');

type NativeExceptionCallback = (classifier: string, message: string, stackTrace: string) => Promise<void>;

describe('AndroidUnhandledExceptionHandler', () => {
    let originalErrorUtils: unknown;

    beforeEach(() => {
        jest.clearAllMocks();
        mockIsNativeBridgeEnabled.mockReturnValue(true);

        originalErrorUtils = (global as unknown as { ErrorUtils?: unknown }).ErrorUtils;
        (global as unknown as { ErrorUtils: unknown }).ErrorUtils = {
            getGlobalHandler: () => jest.fn(),
            setGlobalHandler: jest.fn(),
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

    it('Should stop the native handler on dispose', () => {
        const handler = new AndroidUnhandledExceptionHandler();
        handler.captureManagedErrors({ send: jest.fn() } as unknown as BacktraceClient);

        handler.dispose();

        expect(nativeHandlerMock.stop).toHaveBeenCalledTimes(1);
    });
});
