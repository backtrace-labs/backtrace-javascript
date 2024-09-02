import { TimeHelper } from '@backtrace/sdk-core';
import { BacktraceBrowserSessionProvider } from '../../src/BacktraceBrowserSessionProvider';
describe('Session provider tests', () => {
    it('Should generate a new uuid on new session', () => {
        const sessionProvider = new BacktraceBrowserSessionProvider();

        expect(sessionProvider.sessionId).toBeDefined();
    });

    it('Should reuse the same sessionId', () => {
        const sessionProvider1 = new BacktraceBrowserSessionProvider();
        const sessionProvider2 = new BacktraceBrowserSessionProvider();
        expect(sessionProvider1.sessionId).toEqual(sessionProvider2.sessionId);
    });

    it('Should generate a new sessionId if the lastActive timestamp is greater than persistence interval time', () => {
        const fakeId = 'test';
        const lastSessionActiveDate = new Date(Date.now() - BacktraceBrowserSessionProvider.PERSISTENCE_INTERVAL - 1);
        localStorage.setItem('backtrace-last-active', lastSessionActiveDate.getTime().toString(10));
        localStorage.setItem('backtrace-guid', fakeId);

        const sessionProvider = new BacktraceBrowserSessionProvider();
        expect(sessionProvider.sessionId).toBeDefined();
        expect(sessionProvider.sessionId).not.toEqual(fakeId);
    });

    it('Should not generate a new sessionId if the lastActive timestamp is lower than persistence interval time', () => {
        const fakeId = 'test';
        const lastSessionActiveDate = new Date(Date.now() - BacktraceBrowserSessionProvider.PERSISTENCE_INTERVAL + 10);
        localStorage.setItem('backtrace-last-active', lastSessionActiveDate.getTime().toString(10));
        localStorage.setItem('backtrace-guid', fakeId);

        const sessionProvider = new BacktraceBrowserSessionProvider();
        expect(sessionProvider.sessionId).toBeDefined();
        expect(sessionProvider.sessionId).toEqual(fakeId);
    });

    it('Should update timestamp', () => {
        const timestamp = Date.now();
        jest.spyOn(TimeHelper, 'now').mockImplementation(() => {
            return timestamp;
        });

        localStorage.setItem('backtrace-last-active', new Date(2010, 1, 1, 1, 1, 1, 1).getTime().toString(10));
        const sessionProvider = new BacktraceBrowserSessionProvider();

        sessionProvider.afterMetricsSubmission();

        expect(sessionProvider.lastActive).toEqual(timestamp);
    });
});
