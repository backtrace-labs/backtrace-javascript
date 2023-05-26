import { BacktraceClient } from '../../src/';
describe('Client tests', () => {
    it('Should create a client', () => {
        const client = new BacktraceClient();

        expect(client).toBeDefined();
    });
});
