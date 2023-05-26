import { BacktraceCoreClient } from '../../src/';
describe('Client tests', () => {
    it('Should create a client', () => {
        const client = new BacktraceCoreClient();

        expect(client).toBeDefined();
    });
});
