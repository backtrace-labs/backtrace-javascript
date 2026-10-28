import { BacktraceRequestHandler } from '@backtrace/sdk-core';
import { BacktraceBrowserSessionProvider } from '../../src/BacktraceBrowserSessionProvider.js';
import { BacktraceClient, BacktraceConfiguration } from '../../src/index.js';

describe('Client guid and session tests', () => {
    const requestHandler: BacktraceRequestHandler = {
        post: jest.fn().mockResolvedValue(Promise.resolve()),
        postError: jest.fn().mockResolvedValue(Promise.resolve()),
    };

    const defaultClientOptions: BacktraceConfiguration = {
        name: 'test',
        version: '1.0.0',
        url: 'https://submit.backtrace.io/foo/bar/baz',
        metrics: {
            enable: false,
        },
        breadcrumbs: {
            enable: false,
        },
    };

    let client: BacktraceClient | undefined;

    function buildClient(options: BacktraceConfiguration = defaultClientOptions) {
        client?.dispose();
        client = BacktraceClient.builder(options).useRequestHandler(requestHandler).build();
        return client;
    }

    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        client?.dispose();
        client = undefined;
    });

    it('Should not use the session id as the guid', () => {
        const { attributes } = buildClient();

        expect(attributes['guid']).toBeTruthy();
        expect(attributes['guid']).not.toEqual(attributes['application.session']);
    });

    it('Should keep the guid when the session changes', () => {
        const first = buildClient().attributes;
        const expired = Date.now() - BacktraceBrowserSessionProvider.PERSISTENCE_INTERVAL - 1;
        localStorage.setItem('backtrace-session-last-active', expired.toString(10));
        const second = buildClient().attributes;

        expect(second['application.session']).not.toEqual(first['application.session']);
        expect(second['guid']).toEqual(first['guid']);
    });

    it('Should keep the stored guid and start a new session after upgrade', () => {
        const previousId = 'previous-session-and-guid';
        localStorage.setItem('backtrace-guid', previousId);
        localStorage.setItem('backtrace-last-active', Date.now().toString(10));

        const { attributes } = buildClient({ ...defaultClientOptions, database: { enable: true, path: 'test' } });

        expect(attributes['guid']).toEqual(previousId);
        expect(typeof attributes['application.session']).toBe('string');
        expect(attributes['application.session']).not.toEqual(previousId);
    });
});
