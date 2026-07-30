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

import { CrashReporter } from '../src/crashReporter/CrashReporter';
import { UnhandledExceptionHandler } from '../src/handlers/UnhandledExceptionHandler';

const markFatalErrorMock = CrashReporter.markFatalError as jest.Mock;

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

    beforeEach(() => {
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
    });

    it('Should mark a fatal unhandled error so the native reporter skips the duplicate, then chain the previous handler', () => {
        const error = new Error('boom');
        registeredHandler(error, true);

        expect(sendMock).toHaveBeenCalledWith(error, { 'error.type': 'Unhandled exception', fatal: true });
        expect(markFatalErrorMock).toHaveBeenCalledTimes(1);
        expect(previousGlobalHandler).toHaveBeenCalledWith(error, true);
    });

    it('Should NOT mark a non-fatal unhandled error', () => {
        const error = new Error('boom');
        registeredHandler(error, false);

        expect(sendMock).toHaveBeenCalledWith(error, { 'error.type': 'Unhandled exception', fatal: false });
        expect(markFatalErrorMock).not.toHaveBeenCalled();
        expect(previousGlobalHandler).toHaveBeenCalledWith(error, false);
    });
});
