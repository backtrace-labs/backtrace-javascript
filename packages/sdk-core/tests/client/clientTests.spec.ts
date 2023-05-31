import { BacktraceCoreClient, BacktraceReport } from '../../src/';
describe('Client tests', () => {
    describe('Send tests', () => {
        const client = new BacktraceCoreClient();
        it('Message report shouldnt throw', async () => {
            expect(async () => await client.send('test')).not.toThrow();
        });

        it('Error report shouldnt throw', async () => {
            expect(async () => await client.send(new Error('test'))).not.toThrow();
        });

        it('Report shouldnt throw', async () => {
            expect(async () => await client.send(new BacktraceReport(new Error('test')))).not.toThrow();
        });

        it('Should be able to define nullable parameters', async () => {
            expect(
                async () => await client.send(new BacktraceReport(new Error('test'), undefined, undefined)),
            ).not.toThrow();
        });
    });
});
