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

const nativeMock: {
    initialize: jest.Mock;
    useAttributes: jest.Mock;
    useAttachments?: jest.Mock;
    crash: jest.Mock;
} = {
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
const { BacktraceFileAttachment } = require('../src/attachment/BacktraceFileAttachment');
const { BacktraceStringAttachment } = require('@backtrace/sdk-core');
const { CrashReporter } = require('../src/crashReporter/CrashReporter');
/* eslint-enable @typescript-eslint/no-var-requires */

function createClient() {
    return new BacktraceClient({
        options: {
            url: 'https://submit.backtrace.io/universe/token/json',
            database: { enable: true, captureNativeCrashes: true, path: '/backtrace' },
            metrics: { enable: false },
            breadcrumbs: { enable: false },
            userAttributes: { application: 'nativeAttachmentPropagation', 'application.version': '1.0.0' },
        },
        fileSystem: mockStreamFileSystem(),
    });
}

function fileAttachment(path: string) {
    return new BacktraceFileAttachment(mockStreamFileSystem(), path, path.split('/').pop());
}

function pathsSentToNative(): string[] {
    return (nativeMock.useAttachments as jest.Mock).mock.calls.flatMap((call) => call[0]);
}

describe('BacktraceClient native attachment propagation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        nativeMock.useAttachments = jest.fn();
        // Static, so initialize() would be a no-op after the first test.
        (CrashReporter as unknown as { initialized: boolean }).initialized = false;
    });

    it('Should pass the attachments known at initialization to the native crash reporter', () => {
        const client = createClient();
        client.addAttachment(fileAttachment('/logs/startup.log'));
        client.initialize();

        expect(nativeMock.initialize).toHaveBeenCalledTimes(1);
        expect(nativeMock.initialize.mock.calls[0][3]).toContain('/logs/startup.log');
    });

    it('Should forward an attachment added after initialization to the native crash reporter', () => {
        const client = createClient();
        client.initialize();
        (nativeMock.useAttachments as jest.Mock).mockClear();

        client.addAttachment(fileAttachment('/logs/session.log'));

        expect(nativeMock.useAttachments).toHaveBeenCalled();
        expect(pathsSentToNative()).toContain('/logs/session.log');
    });

    it('Should keep dynamic attachments when a later attachment is added, since native replaces the list', () => {
        const client = createClient();
        client.addAttachment(() => fileAttachment('/logs/breadcrumbs.log'));
        client.initialize();
        (nativeMock.useAttachments as jest.Mock).mockClear();

        client.addAttachment(fileAttachment('/logs/session.log'));

        expect(pathsSentToNative()).toContain('/logs/breadcrumbs.log');
        expect(pathsSentToNative()).toContain('/logs/session.log');
    });

    it('Should NOT send in-memory attachments, which have no native representation', () => {
        const client = createClient();
        client.initialize();
        (nativeMock.useAttachments as jest.Mock).mockClear();

        client.addAttachment(new BacktraceStringAttachment('notes.txt', 'in memory'));

        expect(pathsSentToNative()).toEqual([]);
    });

    it('Should NOT forward attachments once the client is disposed', () => {
        const client = createClient();
        client.initialize();
        client.addAttachment(fileAttachment('/logs/before.log'));
        expect(nativeMock.useAttachments).toHaveBeenCalled();

        client.dispose();
        (nativeMock.useAttachments as jest.Mock).mockClear();
        client.addAttachment(fileAttachment('/logs/after.log'));

        expect(nativeMock.useAttachments).not.toHaveBeenCalled();
    });

    it('Should NOT call the native layer on platforms that cannot update attachments', () => {
        const crashReporter = new CrashReporter(mockStreamFileSystem());
        crashReporter.initialize('https://submit.backtrace.io/universe/token/json', '/backtrace', {}, []);
        delete nativeMock.useAttachments;

        expect(() => crashReporter.updateAttachments([fileAttachment('/logs/android.log')])).not.toThrow();
    });
});
