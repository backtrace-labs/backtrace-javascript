import { TimeHelper } from '@backtrace/sdk-core';
import { BacktraceBrowserSessionProvider } from '../../src/BacktraceBrowserSessionProvider.js';
describe('Session provider tests', () => {
    beforeEach(() => {
        localStorage.clear();
    });

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
        localStorage.setItem('backtrace-session-last-active', lastSessionActiveDate.getTime().toString(10));
        localStorage.setItem('backtrace-session-id', fakeId);

        const sessionProvider = new BacktraceBrowserSessionProvider();
        expect(sessionProvider.sessionId).toBeDefined();
        expect(sessionProvider.sessionId).not.toEqual(fakeId);
    });

    it('Should not generate a new sessionId if the lastActive timestamp is lower than persistence interval time', () => {
        const fakeId = 'test';
        const lastSessionActiveDate = new Date(Date.now() - BacktraceBrowserSessionProvider.PERSISTENCE_INTERVAL + 10);
        localStorage.setItem('backtrace-session-last-active', lastSessionActiveDate.getTime().toString(10));
        localStorage.setItem('backtrace-session-id', fakeId);

        const sessionProvider = new BacktraceBrowserSessionProvider();
        expect(sessionProvider.sessionId).toBeDefined();
        expect(sessionProvider.sessionId).toEqual(fakeId);
    });

    it('Should start a new session if the stored session id is missing', () => {
        localStorage.setItem('backtrace-session-last-active', Date.now().toString(10));

        const sessionProvider = new BacktraceBrowserSessionProvider();
        expect(sessionProvider.newSession).toBe(true);
        expect(sessionProvider.sessionId).toBeTruthy();
        expect(localStorage.getItem('backtrace-session-id')).toEqual(sessionProvider.sessionId);
    });

    it('Should not write to the guid storage key', () => {
        localStorage.setItem('backtrace-guid', 'guid');

        new BacktraceBrowserSessionProvider();
        expect(localStorage.getItem('backtrace-guid')).toEqual('guid');
    });

    it('Should ignore the legacy last-active key', () => {
        const legacyLastActive = Date.now().toString(10);
        localStorage.setItem('backtrace-session-id', 'previous-session');
        localStorage.setItem('backtrace-last-active', legacyLastActive);

        const sessionProvider = new BacktraceBrowserSessionProvider();
        expect(sessionProvider.newSession).toBe(true);
        expect(sessionProvider.sessionId).not.toEqual('previous-session');
        expect(localStorage.getItem('backtrace-last-active')).toEqual(legacyLastActive);
    });

    it('Should update timestamp', () => {
        const timestamp = Date.now();
        jest.spyOn(TimeHelper, 'now').mockImplementation(() => {
            return timestamp;
        });

        localStorage.setItem('backtrace-session-last-active', new Date(2010, 1, 1, 1, 1, 1, 1).getTime().toString(10));
        const sessionProvider = new BacktraceBrowserSessionProvider();

        sessionProvider.afterMetricsSubmission();

        expect(sessionProvider.lastActive).toEqual(timestamp);
    });
});
