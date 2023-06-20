import { BacktraceReport, BacktraceRequestHandler } from '@backtrace/sdk-core';
import fs from 'fs';
import path from 'path';
import { BacktraceBufferAttachment, BacktraceClient, BacktraceFileAttachment } from '../../src/';
describe('Client tests', () => {
    const requestHandler: BacktraceRequestHandler = {
        post: jest.fn().mockResolvedValue(Promise.resolve()),
        postError: jest.fn().mockResolvedValue(Promise.resolve()),
    };

    let client: BacktraceClient;
    it('Should create a client', () => {
        client = BacktraceClient.builder({
            url: 'https://submit.backtrace.io/foo/bar/baz',
        }).build();

        expect(client).toBeDefined();
    });

    describe('Send tests', () => {
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

    describe('Attachment tests', () => {
        const sampleFile = path.join(__dirname, 'mock', 'sampleFile.txt');
        const fileContent = fs.readFileSync(sampleFile, 'utf8');

        it(`Should generate an attachment list based on the client options`, async () => {
            client = BacktraceClient.builder({
                url: 'https://submit.backtrace.io/foo/bar/baz',
                attachments: [sampleFile],
            })
                .useRequestHandler(requestHandler)
                .build();

            expect(client.attachments).toBeDefined();
            expect(client.attachments.length).toEqual(1);
            const input = client.attachments[0].get() as fs.ReadStream;
            const chunks: Buffer[] = [];
            input.on('data', (buf: Buffer) => chunks.push(buf));
            input.on('end', () => {
                expect(Buffer.concat(chunks).toString()).toEqual(fileContent);
            });
        });

        it(`Should allow to setup bufer attachment`, async () => {
            const testedBuffer = Buffer.from('test');
            client = BacktraceClient.builder({
                url: 'https://submit.backtrace.io/foo/bar/baz',
                attachments: [new BacktraceBufferAttachment('test', testedBuffer)],
            })
                .useRequestHandler(requestHandler)
                .build();

            expect(client.attachments).toBeDefined();
            expect(client.attachments.length).toEqual(1);
            expect(client.attachments[0].get()).toEqual(testedBuffer);
        });

        it(`Should allow to add more attachments`, async () => {
            const testedAttachment = new BacktraceFileAttachment(sampleFile);
            client = BacktraceClient.builder({
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
