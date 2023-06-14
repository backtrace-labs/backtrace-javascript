import { BacktraceReport } from '../../src/';
import { BacktraceTestClient } from '../mocks/BacktraceTestClient';
describe('Client tests', () => {
    describe('Send tests', () => {
        const client = BacktraceTestClient.buildFakeClient();

        it(`Sending a message report shouldn't throw an error`, async () => {
            expect(async () => await client.send('test')).not.toThrow();
            expect(client.requestHandler.postError).toBeCalled();
        });

        it(`Sending an error report shouldn't throw`, async () => {
            expect(async () => await client.send(new Error('test'))).not.toThrow();
            expect(client.requestHandler.postError).toBeCalled();
        });

        it(`Sending a report shouldn't throw`, async () => {
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
