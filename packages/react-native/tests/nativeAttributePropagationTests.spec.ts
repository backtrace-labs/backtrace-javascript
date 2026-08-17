import { NativeModules } from 'react-native';
import { mockStreamFileSystem } from './_mocks/fileSystem';

// This package's jest config replaces the react-native preset's setupFiles, so the real Platform throws.
jest.mock('react-native', () => ({
    NativeModules: {},
    Platform: {
        OS: 'ios',
        select: (options: Record<string, unknown>) => (options.ios !== undefined ? options.ios : options.default),
    },
}));

jest.mock('../src/common/platformHelper', () => ({
    version: () => '0.81.6',
}));

const nativeMock = {
    initialize: jest.fn(),
    useAttributes: jest.fn(),
    crash: jest.fn(),
};

// CrashReporter caches BacktraceReactNative in a static field, so the mock has to land before the module loads.
NativeModules.BacktraceReactNative = nativeMock;
NativeModules.BacktraceDirectoryProvider = { applicationDirectory: () => '/' };
(globalThis as unknown as { RN$Bridgeless: boolean }).RN$Bridgeless = true;

/* eslint-disable @typescript-eslint/no-var-requires */
const { BacktraceClient } = require('../src/BacktraceClient');
const { CrashReporter } = require('../src/crashReporter/CrashReporter');
/* eslint-enable @typescript-eslint/no-var-requires */

function createClient() {
    return new BacktraceClient({
        options: {
            url: 'https://submit.backtrace.io/universe/token/json',
            database: { enable: true, captureNativeCrashes: true, path: '/backtrace' },
            metrics: { enable: false },
            breadcrumbs: { enable: false },
            // Normally supplied by the native attribute providers; the core client rejects init without them.
            userAttributes: { application: 'nativeAttributePropagation', 'application.version': '1.0.0' },
        },
        fileSystem: mockStreamFileSystem(),
    });
}

// Every update carries the full scoped set rather than a delta, so merge the calls before asserting.
function attributesSentToNative(): Record<string, string> {
    return Object.assign({}, ...nativeMock.useAttributes.mock.calls.map((call) => call[0]));
}

describe('BacktraceClient native attribute propagation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // initialized is static, and would otherwise make initialize() a no-op for every test after the first.
        (CrashReporter as unknown as { initialized: boolean }).initialized = false;
    });

    it('Should pass the attributes known at initialization to the native crash reporter', () => {
        createClient().initialize();

        expect(nativeMock.initialize).toHaveBeenCalledTimes(1);
        expect(nativeMock.initialize.mock.calls[0][2]['error.type']).toBe('Crash');
    });

    it('Should forward an attribute added after initialization to the native crash reporter', () => {
        const client = createClient();
        client.initialize();
        nativeMock.useAttributes.mockClear();

        client.addAttribute({ 'session.id': 'abc-123' });

        expect(nativeMock.useAttributes).toHaveBeenCalled();
        expect(attributesSentToNative()['session.id']).toBe('abc-123');
    });

    it('Should forward every later attribute update, stringifying non-string values', () => {
        const client = createClient();
        client.initialize();
        nativeMock.useAttributes.mockClear();

        client.addAttribute({ 'session.id': 'abc-123' });
        client.addAttribute({ 'retry.count': 7 });

        const forwarded = attributesSentToNative();
        expect(forwarded['session.id']).toBe('abc-123');
        expect(forwarded['retry.count']).toBe('7');
    });

    it('Should NOT forward attributes once the client is disposed', () => {
        const client = createClient();
        client.initialize();
        client.addAttribute({ 'before.dispose': 'yes' });
        expect(nativeMock.useAttributes).toHaveBeenCalled();

        client.dispose();
        nativeMock.useAttributes.mockClear();
        client.addAttribute({ 'after.dispose': 'no' });

        expect(nativeMock.useAttributes).not.toHaveBeenCalled();
    });
});
