import { BacktraceReport } from '@backtrace/sdk-core';
import type { BacktraceClient } from '../src/BacktraceClient';

jest.mock('promise/setimmediate/rejection-tracking', () => ({
    enable: jest.fn(),
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

import { UnhandledExceptionHandler } from '../src/handlers/UnhandledExceptionHandler';

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
