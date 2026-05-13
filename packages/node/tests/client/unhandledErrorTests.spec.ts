import { BacktraceRequestHandler } from '@backtrace/sdk-core';
import { BacktraceClient } from '../../src/index.js';

describe('Unhandled error/rejection labeling', () => {
    let postedJson: string | undefined;
    let requestHandler: BacktraceRequestHandler;
    let client: BacktraceClient;

    const defaultClientOptions = {
        url: 'https://submit.backtrace.io/foo/bar/baz',
        metrics: { enable: false },
        breadcrumbs: { enable: false },
    };

    beforeEach(() => {
        postedJson = undefined;
        requestHandler = {
            post: jest.fn().mockResolvedValue(Promise.resolve()),
            postError: jest.fn().mockImplementation((_url: string, json: string) => {
                postedJson = json;
                return Promise.resolve();
            }),
        };
        client = BacktraceClient.builder(defaultClientOptions).useRequestHandler(requestHandler).build();
    });

    afterEach(() => {
        client.dispose();
    });

    const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

    it("Should tag uncaughtExceptionMonitor with origin 'unhandledRejection' as 'Unhandled rejection'", async () => {
        (process as unknown as { emit: (e: string, ...args: unknown[]) => void }).emit(
            'uncaughtExceptionMonitor',
            new Error('rejected'),
            'unhandledRejection',
        );
        await flushMicrotasks();

        expect(requestHandler.postError).toHaveBeenCalled();
        const payload = JSON.parse(postedJson as string);
        expect(payload.attributes['error.type']).toBe('Unhandled rejection');
        expect(payload.classifiers).toContain('UnhandledPromiseRejection');
    });

    it("Should tag uncaughtExceptionMonitor with origin 'uncaughtException' as 'Unhandled exception'", async () => {
        (process as unknown as { emit: (e: string, ...args: unknown[]) => void }).emit(
            'uncaughtExceptionMonitor',
            new Error('boom'),
            'uncaughtException',
        );
        await flushMicrotasks();

        expect(requestHandler.postError).toHaveBeenCalled();
        const payload = JSON.parse(postedJson as string);
        expect(payload.attributes['error.type']).toBe('Unhandled exception');
        expect(payload.classifiers ?? []).not.toContain('UnhandledPromiseRejection');
    });
});
