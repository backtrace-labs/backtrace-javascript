import { NativeModules } from 'react-native';
import { promisify } from 'util';
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
    useAttachments: jest.fn(),
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

const nextTick = promisify(process.nextTick);

function createClient() {
    return new BacktraceClient({
        options: {
            url: 'https://submit.backtrace.io/universe/token/json',
            database: { enable: true, captureNativeCrashes: true, path: '/backtrace' },
            metrics: { enable: false },
            breadcrumbs: { maximumBreadcrumbs: 4 },
            userAttributes: { application: 'nativeBreadcrumbPropagation', 'application.version': '1.0.0' },
        },
        fileSystem: mockStreamFileSystem(),
    });
}

function breadcrumbPathsSentToNative(): string[] {
    return nativeMock.useAttachments.mock.calls
        .flatMap((call) => call[0])
        .filter((p: string) => p.includes('breadcrumb'));
}

function attributesSentToNative(): Record<string, string> {
    return Object.assign({}, ...nativeMock.useAttributes.mock.calls.map((call) => call[0]));
}

describe('BacktraceClient native breadcrumb propagation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Static, so initialize() would be a no-op after the first test.
        (CrashReporter as unknown as { initialized: boolean }).initialized = false;
    });

    it('Should tell the native crash reporter about the breadcrumb files created after rotation', async () => {
        const client = createClient();
        client.initialize();

        const pathsAtInit = nativeMock.initialize.mock.calls[0][3].filter((p: string) => p.includes('breadcrumb'));
        nativeMock.useAttachments.mockClear();

        for (let i = 0; i < 20; i++) {
            client.breadcrumbs?.info(`breadcrumb-${i}`);
            await nextTick();
        }

        const sentLater = breadcrumbPathsSentToNative();
        expect(sentLater.length).toBeGreaterThan(0);
        expect(sentLater.some((p) => !pathsAtInit.includes(p))).toBe(true);
    });

    it('Should send the last breadcrumb id to the native crash reporter', async () => {
        const client = createClient();
        client.initialize();
        nativeMock.useAttributes.mockClear();

        for (let i = 0; i < 20; i++) {
            client.breadcrumbs?.info(`breadcrumb-${i}`);
            await nextTick();
        }

        expect(attributesSentToNative()['breadcrumbs.lastId']).toBeDefined();
    });
});
