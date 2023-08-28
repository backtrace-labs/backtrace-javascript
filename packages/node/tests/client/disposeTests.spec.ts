import { BacktraceClient } from '../../src/';
describe('Client Dispose tests', () => {
    it('Should dispose process callbacks', () => {
        const expectedUnhandledRejectionListenerCount = process.listenerCount('unhandledRejection');
        const expectedUncaughtExceptionListenerCount = process.listenerCount('uncaughtExceptionMonitor');
        const client = BacktraceClient.initialize({
            url: 'https://submit.backtrace.io/foo/bar/baz',
            metrics: {
                enable: false,
            },
            breadcrumbs: {
                enable: false,
            },
        });

        expect(
            process.listenerCount('unhandledRejection') + process.listenerCount('uncaughtExceptionMonitor'),
        ).toBeGreaterThan(expectedUnhandledRejectionListenerCount + expectedUncaughtExceptionListenerCount);
        client.dispose();
        expect(process.listenerCount('unhandledRejection')).toBe(expectedUnhandledRejectionListenerCount);
        expect(process.listenerCount('uncaughtExceptionMonitor')).toBe(expectedUncaughtExceptionListenerCount);
    });
});
