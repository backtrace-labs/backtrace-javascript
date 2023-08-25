import { BacktraceReport, BacktraceRequestHandler, BacktraceUint8ArrayAttachment } from '@backtrace-labs/sdk-core';
import { BacktraceClient } from '../../src/';

describe('Client tests', () => {
    const requestHandler: BacktraceRequestHandler = {
        post: jest.fn().mockResolvedValue(Promise.resolve()),
        postError: jest.fn().mockResolvedValue(Promise.resolve()),
    };

    const defaultClientOptions = {
        name: 'test',
        version: '1.0.0',
        url: 'https://submit.backtrace.io/foo/bar/baz',
        metrics: {
            enable: false,
        },
        breadcrumbs: {
            enable: false,
        },
    };

    let client: BacktraceClient;
    it('Should create a client', () => {
        client = BacktraceClient.builder(defaultClientOptions).build();

        expect(client).toBeDefined();
    });

    describe('Send tests', () => {
        beforeEach(() => {
            client = BacktraceClient.builder(defaultClientOptions).useRequestHandler(requestHandler).build();
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
            const testedAttachment = new BacktraceUint8ArrayAttachment('client-add-test', new Uint8Array(0));
            client = BacktraceClient.builder({
                ...defaultClientOptions,
                attachments: [testedAttachment],
            })
                .useRequestHandler(requestHandler)
                .build();

            expect(client.attachments).toBeDefined();
            expect(client.attachments.length).toEqual(1);
            expect(client.attachments[0]).toEqual(testedAttachment);
        });

        it(`Should allow to add more attachments`, async () => {
            const testedAttachment = new BacktraceUint8ArrayAttachment('client-add-test', new Uint8Array(0));
            client = BacktraceClient.builder(defaultClientOptions).useRequestHandler(requestHandler).build();

            client.attachments.push(testedAttachment);
            expect(client.attachments).toBeDefined();
            expect(client.attachments.length).toEqual(1);
            expect(client.attachments[0]).toEqual(testedAttachment);
        });
    });
});
