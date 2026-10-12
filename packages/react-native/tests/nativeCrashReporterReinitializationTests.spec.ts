import { NativeModules } from 'react-native';
import { promisify } from 'util';
import { mockStreamFileSystem } from './_mocks/fileSystem';

// This package's jest config replaces the react-native preset's setupFiles. The real Platform throws.
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

// CrashReporter caches BacktraceReactNative in a static field. The mock has to land before the module loads.
NativeModules.BacktraceReactNative = nativeMock;
NativeModules.BacktraceDirectoryProvider = { applicationDirectory: () => '/' };
(globalThis as unknown as { RN$Bridgeless: boolean }).RN$Bridgeless = true;

/* eslint-disable @typescript-eslint/no-var-requires */
const { BacktraceClient } = require('../src/BacktraceClient');
const { BacktraceFileAttachment } = require('../src/attachment/BacktraceFileAttachment');
const { CrashReporter } = require('../src/crashReporter/CrashReporter');
/* eslint-enable @typescript-eslint/no-var-requires */

const nextTick = promisify(process.nextTick);

const SUBMISSION_URL = 'https://submit.backtrace.io/universe/token/json';

interface ClientOptions {
    userAttributes?: Record<string, string>;
    attachmentPaths?: string[];
    url?: string;
    databasePath?: string;
    breadcrumbs?: boolean;
}

function createClient({
    userAttributes = {},
    attachmentPaths = [],
    url = SUBMISSION_URL,
    databasePath = '/backtrace',
    breadcrumbs = false,
}: ClientOptions = {}) {
    const fileSystem = mockStreamFileSystem();
    return new BacktraceClient({
        options: {
            url,
            database: { enable: true, captureNativeCrashes: true, path: databasePath },
            metrics: { enable: false },
            breadcrumbs: breadcrumbs ? { maximumBreadcrumbs: 4 } : { enable: false },
            userAttributes: {
                application: 'nativeReinitialization',
                'application.version': '1.0.0',
                ...userAttributes,
            },
            attachments: attachmentPaths.map((path) => new BacktraceFileAttachment(fileSystem, path)),
        },
        fileSystem,
    });
}

function initializeClient(options: ClientOptions = {}) {
    const client = createClient(options);
    client.initialize();
    return client;
}

// Every update carries the full scoped set rather than a delta. Merge the calls before asserting.
function attributesSentToNative(): Record<string, string> {
    return Object.assign({}, ...nativeMock.useAttributes.mock.calls.map((call) => call[0]));
}

function attachmentPathsSentToNative(): string[] {
    return nativeMock.useAttachments.mock.calls.flatMap((call) => call[0]);
}

describe('BacktraceClient native crash reporter re-initialization', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        // initialized is static, and would otherwise make initialize() a no-op for every test after the first.
        (CrashReporter as unknown as { initialized: boolean }).initialized = false;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('Should pass the attributes of a client created after dispose to the native crash reporter', () => {
        initializeClient({ userAttributes: { 'user.id': 'first-user' } }).dispose();
        nativeMock.useAttributes.mockClear();

        initializeClient({ userAttributes: { 'user.id': 'second-user' } });

        expect(nativeMock.initialize).toHaveBeenCalledTimes(1);
        expect(attributesSentToNative()['user.id']).toBe('second-user');
    });

    it('Should clear attributes only the disposed client had in the native crash reporter', () => {
        const first = initializeClient({
            userAttributes: { 'user.id': 'first-user', 'user.email': 'first@example.com' },
        });
        first.addAttribute({ 'session.id': 'first-session' });
        first.dispose();
        nativeMock.useAttributes.mockClear();

        initializeClient({ userAttributes: { 'user.id': 'second-user' } });

        const forwarded = attributesSentToNative();
        expect(forwarded['user.email']).toBe('');
        expect(forwarded['session.id']).toBe('');
        expect(forwarded['application']).toBe('nativeReinitialization');
    });

    it('Should pass the attachments of a client created after dispose to the native crash reporter', () => {
        initializeClient({ attachmentPaths: ['/logs/first.log'] }).dispose();
        nativeMock.useAttachments.mockClear();

        initializeClient({ attachmentPaths: ['/logs/second.log'] });

        expect(attachmentPathsSentToNative()).toContain('/logs/second.log');
        expect(attachmentPathsSentToNative()).not.toContain('/logs/first.log');
    });

    it('Should forward an attribute added to a client created after dispose to the native crash reporter', () => {
        initializeClient({ userAttributes: { 'user.id': 'first-user' } }).dispose();
        const second = initializeClient({ userAttributes: { 'user.id': 'second-user' } });
        nativeMock.useAttributes.mockClear();

        second.addAttribute({ 'session.id': 'second-session' });

        expect(attributesSentToNative()['session.id']).toBe('second-session');
    });

    it('Should forward breadcrumbs of a client created after dispose to the native crash reporter', async () => {
        initializeClient({ breadcrumbs: true }).dispose();
        const second = initializeClient({ breadcrumbs: true });
        nativeMock.useAttributes.mockClear();
        nativeMock.useAttachments.mockClear();

        for (let i = 0; i < 20; i++) {
            second.breadcrumbs?.info(`breadcrumb-${i}`);
            await nextTick();
        }

        expect(attachmentPathsSentToNative().some((path) => path.includes('breadcrumb'))).toBe(true);
        expect(attributesSentToNative()['breadcrumbs.lastId']).toBeDefined();
    });

    it('Should NOT forward attributes from the disposed client once a new client is initialized', () => {
        const first = initializeClient({ userAttributes: { 'user.id': 'first-user' } });
        first.dispose();
        initializeClient({ userAttributes: { 'user.id': 'second-user' } });
        nativeMock.useAttributes.mockClear();

        first.addAttribute({ 'user.id': 'first-user' });

        expect(nativeMock.useAttributes).not.toHaveBeenCalled();
    });

    it('Should forward attributes after the same client is disposed and initialized again', () => {
        const client = initializeClient({ userAttributes: { 'user.id': 'first-user' } });
        client.dispose();
        client.initialize();
        nativeMock.useAttributes.mockClear();

        client.addAttribute({ 'user.id': 'second-user' });

        expect(attributesSentToNative()['user.id']).toBe('second-user');
    });

    it('Should forward attributes after the same client is initialized twice without dispose', () => {
        const client = initializeClient({ userAttributes: { 'user.id': 'first-user' } });
        client.initialize();
        nativeMock.useAttributes.mockClear();

        client.addAttribute({ 'user.id': 'second-user' });

        expect(attributesSentToNative()['user.id']).toBe('second-user');
    });

    it('Should keep the native crash reporter on the first client while it is not disposed', () => {
        const first = initializeClient({ userAttributes: { 'user.id': 'first-user' } });
        nativeMock.useAttributes.mockClear();
        nativeMock.useAttachments.mockClear();

        const second = initializeClient({
            userAttributes: { 'user.id': 'second-user' },
            attachmentPaths: ['/logs/second.log'],
        });
        expect(nativeMock.useAttributes).not.toHaveBeenCalled();
        expect(nativeMock.useAttachments).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('stays with the client that is still running'),
        );

        second.addAttribute({ 'session.id': 'second-session' });
        expect(nativeMock.useAttributes).not.toHaveBeenCalled();

        first.addAttribute({ 'session.id': 'first-session' });
        expect(attributesSentToNative()['session.id']).toBe('first-session');
    });

    it('Should keep the native crash reporter on the live client when a disposed client is initialized again', () => {
        const first = initializeClient({ userAttributes: { 'user.id': 'first-user' } });
        first.dispose();
        const second = initializeClient({ userAttributes: { 'user.id': 'second-user' } });
        first.initialize();
        nativeMock.useAttributes.mockClear();

        first.addAttribute({ 'session.id': 'first-session' });
        expect(nativeMock.useAttributes).not.toHaveBeenCalled();

        second.addAttribute({ 'session.id': 'second-session' });
        expect(attributesSentToNative()['session.id']).toBe('second-session');
    });

    it('Should warn when a client created after dispose uses a different submission url', () => {
        initializeClient({ userAttributes: { 'user.id': 'first-user' } }).dispose();

        initializeClient({
            userAttributes: { 'user.id': 'second-user' },
            url: 'https://submit.backtrace.io/other-universe/token/json',
        });

        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('submission url and database path'));
        expect(attributesSentToNative()['user.id']).toBe('second-user');
    });

    it('Should warn when a client created after dispose uses a different database path', () => {
        initializeClient({ userAttributes: { 'user.id': 'first-user' } }).dispose();

        initializeClient({ userAttributes: { 'user.id': 'second-user' }, databasePath: '/other-backtrace' });

        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('submission url and database path'));
        expect(attributesSentToNative()['user.id']).toBe('second-user');
    });

    it('Should NOT warn when a client created after dispose uses the same configuration', () => {
        initializeClient({ userAttributes: { 'user.id': 'first-user' } }).dispose();

        initializeClient({ userAttributes: { 'user.id': 'second-user' } });

        expect(console.warn).not.toHaveBeenCalled();
    });
});
