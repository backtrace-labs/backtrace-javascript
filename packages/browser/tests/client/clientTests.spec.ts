import { BacktraceReport, BacktraceRequestHandler } from '@backtrace/sdk-core';
import { BacktraceClient } from '../../src/';

describe('Client tests', () => {
    it('Should create a client', () => {
        const client = BacktraceClient.builder({
            url: 'https://submit.backtrace.io/foo/bar/baz',
        }).build();

        expect(client).toBeDefined();
    });

    describe('Send tests', () => {
        const requestHandler: BacktraceRequestHandler = {
            post: jest.fn().mockResolvedValue(Promise.resolve()),
            postError: jest.fn().mockResolvedValue(Promise.resolve()),
        };
        let client: BacktraceClient;

        beforeEach(() => {
            client = BacktraceClient.builder({
                url: 'https://submit.backtrace.io/foo/bar/baz',
            })
                .useRequestHandler(requestHandler)
                .build();
        });
        it(`Should not throw an error when sending a message`, async () => {
            expect(async () => await client.send('test')).not.toThrow();
            expect(requestHandler.postError).toBeCalled();
        });

        it(`Should not throw when sending an error report`, async () => {
            expect(async () => await client.send(new Error('test'))).not.toThrow();
            expect(requestHandler.postError).toBeCalled();
        });

        it(`Should not throw when sending a report`, async () => {
            expect(async () => await client.send(new BacktraceReport(new Error('test')))).not.toThrow();
            expect(requestHandler.postError).toBeCalled();
        });
    });
});
