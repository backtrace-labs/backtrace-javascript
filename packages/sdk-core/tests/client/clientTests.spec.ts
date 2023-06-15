import { BacktraceReport } from '../../src/';
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
});
