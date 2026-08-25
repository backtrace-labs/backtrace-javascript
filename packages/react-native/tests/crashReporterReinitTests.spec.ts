import { NativeModules } from 'react-native';
import { mockStreamFileSystem } from './_mocks/fileSystem';

// Proof for the dispose/re-init defect: CrashReporter.initialized is static and never reset,
// so a client created after dispose() silently loses native crash reporting.
// These tests document CURRENT behavior; they are evidence, not a regression suite.

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
    useAttachments: jest.fn(),
    crash: jest.fn(),
};

NativeModules.BacktraceReactNative = nativeMock;
NativeModules.BacktraceDirectoryProvider = { applicationDirectory: () => '/' };
(globalThis as unknown as { RN$Bridgeless: boolean }).RN$Bridgeless = true;

/* eslint-disable @typescript-eslint/no-var-requires */
const { BacktraceClient } = require('../src/BacktraceClient');
/* eslint-enable @typescript-eslint/no-var-requires */

function createClient() {
    return new BacktraceClient({
        options: {
            url: 'https://submit.backtrace.io/universe/token/json',
            database: { enable: true, captureNativeCrashes: true, path: '/backtrace' },
            metrics: { enable: false },
            breadcrumbs: { enable: false },
            userAttributes: { application: 'reinitProof', 'application.version': '1.0.0' },
        },
        fileSystem: mockStreamFileSystem(),
    });
}

describe('CrashReporter dispose and re-initialize (current behavior proof)', () => {
    it('Should never reinitialize the native crash reporter after dispose, and updates stay dead', () => {
        const first = createClient();
        first.initialize();
        expect(nativeMock.initialize).toHaveBeenCalledTimes(1);

        first.addAttribute({ 'first.client': 'works' });
        expect(nativeMock.useAttributes).toHaveBeenCalled();

        first.dispose();

        const second = createClient();
        second.initialize();
        // Static guard: the second client never reaches native init.
        expect(nativeMock.initialize).toHaveBeenCalledTimes(1);

        nativeMock.useAttributes.mockClear();
        second.addAttribute({ 'second.client': 'lost' });
        // _enabled stayed false on the second reporter, so native never hears about this.
        expect(nativeMock.useAttributes).not.toHaveBeenCalled();
    });
});
