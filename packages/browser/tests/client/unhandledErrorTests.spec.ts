import { BacktraceRequestHandler } from '@backtrace/sdk-core';
import { BacktraceClient } from '../../src/index.js';

describe('Unhandled error/rejection labeling', () => {
    let postedJson: string | undefined;
    let requestHandler: BacktraceRequestHandler;
    let client: BacktraceClient;

    const defaultClientOptions = {
        name: 'test',
        version: '1.0.0',
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

    it("Should tag synthetic 'unhandledrejection' events with error.type 'Unhandled rejection'", async () => {
        const event = new Event('unhandledrejection') as PromiseRejectionEvent;
        Object.defineProperty(event, 'reason', { value: new TypeError('Failed to fetch') });
        Object.defineProperty(event, 'promise', { value: Promise.resolve() });
        window.dispatchEvent(event);

        await flushMicrotasks();

        expect(requestHandler.postError).toHaveBeenCalled();
        expect(postedJson).toBeDefined();
        const payload = JSON.parse(postedJson as string);
        expect(payload.attributes['error.type']).toBe('Unhandled rejection');
        expect(payload.classifiers).toContain('UnhandledPromiseRejection');
    });

    it("Should tag synthetic 'error' events with error.type 'Unhandled exception'", async () => {
        const event = new ErrorEvent('error', {
            error: new Error('boom'),
            message: 'boom',
        });
        window.dispatchEvent(event);

        await flushMicrotasks();

        expect(requestHandler.postError).toHaveBeenCalled();
        expect(postedJson).toBeDefined();
        const payload = JSON.parse(postedJson as string);
        expect(payload.attributes['error.type']).toBe('Unhandled exception');
        expect(payload.classifiers ?? []).not.toContain('UnhandledPromiseRejection');
    });
});
