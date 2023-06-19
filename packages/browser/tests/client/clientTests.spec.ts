import { BacktraceReport, BacktraceRequestHandler } from '@backtrace/sdk-core';
import { BacktraceClient } from '../../src/';

describe('Client tests', () => {
    const requestHandler: BacktraceRequestHandler = {
        post: jest.fn().mockResolvedValue(Promise.resolve()),
        postError: jest.fn().mockResolvedValue(Promise.resolve()),
    };

    let client: BacktraceClient;
    it('Should create a client', () => {
        client = BacktraceClient.builder({
            name: 'test',
            version: '1.0.0',
            url: 'https://submit.backtrace.io/foo/bar/baz',
        }).build();

        expect(client).toBeDefined();
    });

    describe('Send tests', () => {
        beforeEach(() => {
            client = BacktraceClient.builder({
                name: 'test',
                version: '1.0.0',
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

    describe('Attachment tests', () => {
        it(`Should generate an attachment list based on the client options`, async () => {
            const testedAttachment = {
                name: 'client-in-memory-test',
                get() {
                    return new Uint8Array(0);
                },
            };
            client = BacktraceClient.builder({
                name: 'test',
                version: '1.0.0',
                url: 'https://submit.backtrace.io/foo/bar/baz',
                attachments: [testedAttachment],
            })
                .useRequestHandler(requestHandler)
                .build();

            expect(client.attachments).toBeDefined();
            expect(client.attachments.length).toEqual(1);
            expect(client.attachments[0]).toEqual(testedAttachment);
        });

        it(`Should allow to add more attachments`, async () => {
            const testedAttachment = {
                name: 'client-add-test',
                get() {
                    return new Uint8Array(0);
                },
            };
            client = BacktraceClient.builder({
                name: 'test',
                version: '1.0.0',
                url: 'https://submit.backtrace.io/foo/bar/baz',
                attachments: [],
            })
                .useRequestHandler(requestHandler)
                .build();

            client.attachments.push(testedAttachment);
            expect(client.attachments).toBeDefined();
            expect(client.attachments.length).toEqual(1);
            expect(client.attachments[0]).toEqual(testedAttachment);
        });
    });
});
