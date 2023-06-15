import { BacktraceClient } from '../../src/';
describe('Client tests', () => {
    it('Should create a client', () => {
        const client = BacktraceClient.builder({
            url: 'https://submit.backtrace.io/foo/bar/baz',
        }).build();

        expect(client).toBeDefined();
    });
});
