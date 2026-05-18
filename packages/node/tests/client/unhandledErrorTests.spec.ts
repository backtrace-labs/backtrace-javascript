import { BacktraceRequestHandler } from '@backtrace/sdk-core';
import { BacktraceClient } from '../../src/index.js';
import { NodeOptionReader } from '../../src/common/NodeOptionReader.js';

describe('Unhandled error/rejection labeling', () => {
    let postedJson: string | undefined;
    let requestHandler: BacktraceRequestHandler;
    let client: BacktraceClient;

    const defaultClientOptions = {
        url: 'https://submit.backtrace.io/foo/bar/baz',
        metrics: { enable: false },
        breadcrumbs: { enable: false },
    };

    const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

    const buildClient = () => {
        postedJson = undefined;
        requestHandler = {
            post: jest.fn().mockResolvedValue(Promise.resolve()),
            postError: jest.fn().mockImplementation((_url: string, json: string) => {
                postedJson = json;
                return Promise.resolve();
            }),
        };
        return BacktraceClient.builder(defaultClientOptions).useRequestHandler(requestHandler).build();
    };

    describe('uncaughtExceptionMonitor callback', () => {
        beforeEach(() => {
            client = buildClient();
        });

        afterEach(() => {
            client.dispose();
        });

        it("Should tag origin 'unhandledRejection' as 'Unhandled rejection'", async () => {
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

        it("Should tag origin 'uncaughtException' as 'Unhandled exception'", async () => {
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

    describe("dedicated 'unhandledRejection' listener", () => {
        let nodeOptionReaderSpy: jest.SpyInstance;

        beforeEach(() => {
            // Force the dedicated unhandledRejection listener to be registered.
            // See BacktraceClient.captureUnhandledErrors: the listener is skipped
            // when running on Node 15+ with default --unhandled-rejections behavior.
            nodeOptionReaderSpy = jest.spyOn(NodeOptionReader, 'read').mockImplementation((flag: string) => {
                if (flag === 'unhandled-rejections') return 'warn';
                return undefined;
            });
            client = buildClient();
        });

        afterEach(() => {
            client.dispose();
            nodeOptionReaderSpy.mockRestore();
        });

        it("Should tag emitted 'unhandledRejection' events as 'Unhandled rejection'", async () => {
            (process as unknown as { emit: (e: string, ...args: unknown[]) => void }).emit(
                'unhandledRejection',
                new Error('rejected'),
                Promise.resolve(),
            );
            await flushMicrotasks();

            expect(requestHandler.postError).toHaveBeenCalled();
            const payload = JSON.parse(postedJson as string);
            expect(payload.attributes['error.type']).toBe('Unhandled rejection');
            expect(payload.classifiers).toContain('UnhandledPromiseRejection');
        });
    });
});
