import { NativeModules } from 'react-native';
import { mockStreamFileSystem } from './_mocks/fileSystem';

// This package's jest config replaces the react-native preset's setupFiles; the real Platform throws.
jest.mock('react-native', () => ({
    NativeModules: {},
    Platform: {
        OS: 'ios',
        constants: {},
        select: (options: Record<string, unknown>) => (options.ios !== undefined ? options.ios : options.default),
    },
}));

jest.mock('../src/common/platformHelper', () => ({
    version: () => '0.81.6',
}));

jest.mock('promise/setimmediate/rejection-tracking', () => ({
    enable: jest.fn(),
}));

const nativeMock = {
    initialize: jest.fn(),
    useAttributes: jest.fn(),
    useAttachments: jest.fn(),
    crash: jest.fn(),
};

// CrashReporter reads BacktraceReactNative into a static field at module load.
NativeModules.BacktraceReactNative = nativeMock;
(globalThis as unknown as { RN$Bridgeless: boolean }).RN$Bridgeless = true;
(globalThis as unknown as { ErrorUtils: unknown }).ErrorUtils = {
    getGlobalHandler: () => jest.fn(),
    setGlobalHandler: jest.fn(),
};

/* eslint-disable @typescript-eslint/no-var-requires */
const { BacktraceClient } = require('../src/BacktraceClient');
const { CrashReporter } = require('../src/crashReporter/CrashReporter');
const { UnhandledExceptionHandler } = require('../src/handlers/UnhandledExceptionHandler');
const { WebRequestEventSubscriber } = require('../src/breadcrumbs/events/WebRequestEventSubscriber');
const { ErrorBoundary } = require('../src/ErrorBoundary');
/* eslint-enable @typescript-eslint/no-var-requires */

const URL = 'https://submit.backtrace.io/universe/token/json';

function warnings(warnSpy: jest.SpyInstance): string {
    return warnSpy.mock.calls.map((call) => String(call[0])).join('\n');
}

describe('Self healing', () => {
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        (CrashReporter as unknown as { initialized: boolean }).initialized = false;
        (BacktraceClient as unknown as { _instance?: unknown })._instance = undefined;
    });

    afterEach(() => {
        BacktraceClient.instance?.dispose();
        warnSpy.mockRestore();
    });

    describe('initialize', () => {
        it('Should return an enabled client and fall back when the application attributes are unavailable', () => {
            const client = BacktraceClient.initialize({
                url: URL,
                metrics: { enable: false },
                breadcrumbs: { enable: false },
            });

            expect(client.enabled).toBe(true);
            expect(client.attributes['application']).toBe('unknown');
            expect(client.attributes['application.version']).toBe('unknown');
            expect(warnings(warnSpy)).toContain('application and application.version not found');
        });

        it('Should keep user-provided application attributes over the fallback', () => {
            const client = BacktraceClient.initialize({
                url: URL,
                metrics: { enable: false },
                breadcrumbs: { enable: false },
                userAttributes: { application: 'my-app', 'application.version': '2.0.0' },
            });

            expect(client.attributes['application']).toBe('my-app');
            expect(client.attributes['application.version']).toBe('2.0.0');
            expect(warnings(warnSpy)).not.toContain('not found');
        });

        it('Should run without the file system when the native storage modules are missing', () => {
            const client = BacktraceClient.initialize({
                url: URL,
                metrics: { enable: false },
                breadcrumbs: { enable: false },
                database: { enable: true, captureNativeCrashes: true, path: '/backtrace' },
            });

            expect(client.enabled).toBe(true);
            expect(client.database).toBeUndefined();
            expect(warnings(warnSpy)).toContain('native storage modules are missing');
        });

        it('Should disable the database instead of throwing when database.path is missing', () => {
            const client = BacktraceClient.initialize({
                url: URL,
                metrics: { enable: false },
                breadcrumbs: { enable: false },
                database: { enable: true, createDatabaseDirectory: true } as never,
            });

            expect(client.enabled).toBe(true);
            expect(client.database).toBeUndefined();
            expect(warnings(warnSpy)).toContain('database.path is missing');
            expect(warnings(warnSpy)).not.toContain('error reporting is off');
        });

        it('Should return a disabled client instead of throwing when the client cannot be created', async () => {
            const client = BacktraceClient.initialize({ url: undefined as unknown as string });

            expect(client).toBeDefined();
            expect(client.enabled).toBe(false);
            expect((await client.send('message')).status).not.toBe('Ok');
            expect(warnings(warnSpy)).toContain('error reporting is off');
        });

        it('Should stay enabled when the native crash reporter throws during initialization', async () => {
            nativeMock.initialize.mockImplementation(() => {
                throw new Error('native init failed');
            });

            const client = new BacktraceClient({
                options: {
                    url: URL,
                    metrics: { enable: false },
                    breadcrumbs: { enable: false },
                    database: { enable: true, captureNativeCrashes: true, path: '/backtrace' },
                    userAttributes: { application: 'app', 'application.version': '1.0.0' },
                },
                fileSystem: mockStreamFileSystem(),
            });
            client.initialize();

            expect(client.enabled).toBe(true);
            expect(warnings(warnSpy)).toContain('native crash reporting is off');
            client.dispose();
        });

        it('Should report every native disable reason', () => {
            nativeMock.initialize.mockReturnValue(false);

            const client = new BacktraceClient({
                options: {
                    url: URL,
                    metrics: { enable: false },
                    breadcrumbs: { enable: false },
                    database: { enable: true, captureNativeCrashes: true, path: '/backtrace' },
                    userAttributes: { application: 'app', 'application.version': '1.0.0' },
                },
                fileSystem: mockStreamFileSystem(),
            });
            client.initialize();

            expect(warnings(warnSpy)).toContain('the native crash handler did not start');
            client.dispose();
        });

        it('Should allow a fresh client after dispose', () => {
            const first = BacktraceClient.initialize({
                url: URL,
                metrics: { enable: false },
                breadcrumbs: { enable: false },
            });
            first.dispose();

            const second = BacktraceClient.initialize({
                url: URL,
                metrics: { enable: false },
                breadcrumbs: { enable: false },
            });
            expect(second).not.toBe(first);
            expect(second.enabled).toBe(true);
        });
    });

    describe('global error handler', () => {
        let registeredHandler: (error: Error, fatal?: boolean) => void;
        let previousGlobalHandler: jest.Mock;

        beforeEach(() => {
            previousGlobalHandler = jest.fn();
            (globalThis as unknown as { ErrorUtils: unknown }).ErrorUtils = {
                getGlobalHandler: () => previousGlobalHandler,
                setGlobalHandler: (fn: typeof registeredHandler) => {
                    registeredHandler = fn;
                },
            };
        });

        it('Should call the previous handler even when reporting throws', () => {
            const handler = new UnhandledExceptionHandler();
            handler.captureManagedErrors({
                send: () => {
                    throw new Error('send failed');
                },
            });

            const error = new Error('app error');
            expect(() => registeredHandler(error, true)).not.toThrow();
            expect(previousGlobalHandler).toHaveBeenCalledWith(error, true);
            expect(warnings(warnSpy)).toContain('failed to report an unhandled error');
        });

        it('Should call the previous handler after the handler is disposed', () => {
            const send = jest.fn();
            const handler = new UnhandledExceptionHandler();
            handler.captureManagedErrors({ send });
            handler.dispose();

            const error = new Error('app error');
            registeredHandler(error, false);

            expect(send).not.toHaveBeenCalled();
            expect(previousGlobalHandler).toHaveBeenCalledWith(error, false);
        });
    });

    describe('web request breadcrumbs', () => {
        it('Should preserve the async flag passed to XMLHttpRequest.open', () => {
            const open = jest.fn();
            class FakeXhr {
                public static DONE = 4;
            }
            (FakeXhr.prototype as unknown as { open: jest.Mock }).open = open;
            (globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = FakeXhr;
            (globalThis as unknown as { window: unknown }).window = { fetch: jest.fn() };

            const subscriber = new WebRequestEventSubscriber();
            subscriber.start({ breadcrumbsType: 0xffff, addBreadcrumb: jest.fn() });

            const xhr = new FakeXhr();
            FakeXhr.prototype.open.call(xhr, 'GET', 'https://example.com', false);
            FakeXhr.prototype.open.call(xhr, 'GET', 'https://example.com');

            expect(open.mock.calls[0][2]).toBe(false);
            expect(open.mock.calls[1][2]).toBe(true);
            subscriber.dispose();
        });
    });

    describe('error boundary', () => {
        it('Should not throw when the client is not initialized', () => {
            expect(() => new ErrorBoundary({ children: null })).not.toThrow();
            expect(warnings(warnSpy)).toContain('ErrorBoundary reports nothing');

            const boundary = new ErrorBoundary({ children: null });
            expect(() => boundary.componentDidCatch(new Error('render'), { componentStack: '' })).not.toThrow();
        });
    });
});
