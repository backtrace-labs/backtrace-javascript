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

// Keep the builder away from the native modules:
// with the bridge reported as unavailable it registers neither native attribute providers nor the native file system, and the test injects a mocked file system instead.
NativeModules.UIManager = {};
NativeModules.BacktraceDirectoryProvider = { applicationDirectory: () => '/' };

// Loaded through the package entry point on purpose: this is the path applications take,
// it's where the circular imports between the client, the builder and the breadcrumbs storage used to surface.
/* eslint-disable @typescript-eslint/no-var-requires */
const { BacktraceClient, BacktraceClientBuilder, BacktraceFileAttachment } = require('../src');
/* eslint-enable @typescript-eslint/no-var-requires */

const nextTick = promisify(process.nextTick);

const options = {
    url: 'https://submit.backtrace.io/universe/token/json',
    database: { enable: true, path: '/backtrace' },
    metrics: { enable: false },
    breadcrumbs: { enable: true, maximumBreadcrumbs: 4 },
    captureUnhandledErrors: false,
    captureUnhandledPromiseRejections: false,
    userAttributes: { application: 'clientInitialization', 'application.version': '1.0.0' },
};

describe('BacktraceClient initialization through the package entry point', () => {
    afterEach(() => {
        BacktraceClient.instance?.dispose();
        // initialize() stores the singleton on BacktraceClient itself, which dispose() does not clear.
        (BacktraceClient as { _instance?: unknown })._instance = undefined;
    });

    it('Should create the builder from the client', () => {
        expect(BacktraceClient.builder(options)).toBeInstanceOf(BacktraceClientBuilder);
    });

    it('Should initialize the client through the builder', () => {
        const client = BacktraceClient.initialize(options, (builder: typeof BacktraceClientBuilder.prototype) => {
            expect(builder).toBeInstanceOf(BacktraceClientBuilder);
            builder.useFileSystem(mockStreamFileSystem());
        });

        expect(client).toBeInstanceOf(BacktraceClient);
        expect(BacktraceClient.instance).toBe(client);
    });

    it('Should expose breadcrumb files as file attachments', async () => {
        const client = BacktraceClient.initialize(options, (builder: typeof BacktraceClientBuilder.prototype) =>
            builder.useFileSystem(mockStreamFileSystem()),
        );

        // Enough breadcrumbs to rotate the breadcrumb files at least once.
        for (let i = 0; i < 20; i++) {
            client.breadcrumbs?.info(`breadcrumb-${i}`);
            await nextTick();
        }
        for (let i = 0; i < 10; i++) {
            await nextTick();
        }

        const attachments = client.attachments.filter((attachment) => attachment instanceof BacktraceFileAttachment);
        expect(attachments.length).toBeGreaterThan(0);
    });
});
