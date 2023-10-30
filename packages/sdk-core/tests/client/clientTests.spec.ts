import { BacktraceReport, BacktraceStringAttachment } from '../../src/';
import { BacktraceTestClient } from '../mocks/BacktraceTestClient';
describe('Client tests', () => {
    describe('Send tests', () => {
        const client = BacktraceTestClient.buildFakeClient();

        it(`Should not throw an error when sending a message`, async () => {
            expect(async () => await client.send('test')).not.toThrow();
            expect(client.requestHandler.postError).toBeCalled();
        });

        it(`Should not throw when sending an error report`, async () => {
            expect(async () => await client.send(new Error('test'))).not.toThrow();
            expect(client.requestHandler.postError).toBeCalled();
        });

        it(`Should not throw when sending data with unexpected payload`, async () => {
            expect(async () => await client.send([{ foo: 'bar' }, { bar: 'baz' }] as unknown as string)).not.toThrow();
            expect(client.requestHandler.postError).toBeCalled();
        });

        it(`Should not throw when sending an error with unexpected payload`, async () => {
            expect(async () => {
                const payload = [{ foo: 'bar' }, { bar: 'baz' }] as unknown as string;
                const error = new Error('test');
                error.message = payload;
                await client.send(error);
            }).not.toThrow();
            expect(client.requestHandler.postError).toBeCalled();
        });

        it(`Should not throw when sending a report`, async () => {
            expect(async () => await client.send(new BacktraceReport(new Error('test')))).not.toThrow();
            expect(client.requestHandler.postError).toBeCalled();
        });

        it('Should be able to define nullable parameters', async () => {
            expect(
                async () => await client.send(new BacktraceReport(new Error('test'), undefined, undefined)),
            ).not.toThrow();
            expect(client.requestHandler.postError).toBeCalled();
        });
    });

    describe('Attachment tests', () => {
        const disabledBreadcrumbsConfiguration = {
            breadcrumbs: { enable: false },
        };
        it(`Should generate an empty attachment list`, async () => {
            const client = BacktraceTestClient.buildFakeClient(disabledBreadcrumbsConfiguration);

            expect(client.attachments).toBeDefined();
            expect(client.attachments.length).toEqual(0);
        });

        it(`Should generate an attachment list based on the client options`, async () => {
            const inMemoryAttachment = {
                name: 'client-in-memory-test',
                get() {
                    return Buffer.from('test');
                },
            };

            const client = BacktraceTestClient.buildFakeClient(
                disabledBreadcrumbsConfiguration,
                [],
                [inMemoryAttachment],
            );

            expect(client.attachments).toBeDefined();
            expect(client.attachments.length).toEqual(1);
            expect(client.attachments[0]).toEqual(inMemoryAttachment);
        });

        it(`Should allow to add more attachments`, async () => {
            const client = BacktraceTestClient.buildFakeClient(disabledBreadcrumbsConfiguration);
            const inMemoryAttachment = {
                name: 'client-in-memory-test',
                get() {
                    return Buffer.from('test');
                },
            };

            client.addAttachment(inMemoryAttachment);

            expect(client.attachments).toBeDefined();
            expect(client.attachments.length).toEqual(1);
            expect(client.attachments[0]).toBe(inMemoryAttachment);
        });

        it(`Should allow to use string attachment`, async () => {
            const expectedAttachmentContent = 'test';
            const testedAttachment = new BacktraceStringAttachment('client-add-test', expectedAttachmentContent);
            const client = BacktraceTestClient.buildFakeClient(disabledBreadcrumbsConfiguration);
            client.addAttachment(testedAttachment);

            expect(client.attachments).toBeDefined();
            expect(client.attachments.length).toEqual(1);
            expect(client.attachments[0]).toEqual(testedAttachment);
        });

        it(`Should merge client attachments with report attachments`, async () => {
            const clientAttachment = {
                name: 'client-add-test',
                get() {
                    return new Uint8Array(0);
                },
            };
            const reportAttachment = {
                name: 'report-test',
                get() {
                    return new Uint8Array(0);
                },
            };
            const client = BacktraceTestClient.buildFakeClient(
                disabledBreadcrumbsConfiguration,
                [],
                [clientAttachment],
            );

            await client.send(new Error(''), {}, [reportAttachment]);

            expect(client.requestHandler.postError).toHaveBeenCalledWith(expect.any(String), expect.any(String), [
                clientAttachment,
                reportAttachment,
            ]);
        });
    });
});
