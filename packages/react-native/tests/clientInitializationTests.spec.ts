import {
    BacktraceReportSubmissionResult,
    BreadcrumbType,
    type BacktraceAttachment,
    type BacktraceCoreClientBuilder,
    type Breadcrumb,
} from '@backtrace/sdk-core';
import assert from 'assert';
import { NativeModules } from 'react-native';
import { promisify } from 'util';
import { version as packageVersion } from '../package.json';
import { ReactNativeRequestHandler } from '../src/ReactNativeRequestHandler';
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
const { BacktraceClient, BacktraceClientBuilder, BacktraceFileAttachment } =
    require('../src') as typeof import('../src');
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
        jest.restoreAllMocks();
    });

    it('Should create the builder from the client', () => {
        expect(BacktraceClient.builder(options)).toBeInstanceOf(BacktraceClientBuilder);
    });

    it('Should initialize the client through the builder', () => {
        const client = BacktraceClient.initialize(options, (builder: BacktraceCoreClientBuilder) => {
            expect(builder).toBeInstanceOf(BacktraceClientBuilder);
            builder.useFileSystem(mockStreamFileSystem());
        });

        expect(client).toBeInstanceOf(BacktraceClient);
        expect(BacktraceClient.instance).toBe(client);
        expect(client.agentVersion).toBe(packageVersion);
    });

    it('Should clear the disposed singleton and initialize a new enabled client', () => {
        const first = BacktraceClient.initialize(options, (builder: BacktraceCoreClientBuilder) =>
            builder.useFileSystem(mockStreamFileSystem()),
        );

        first.dispose();

        expect(first.enabled).toBe(false);
        expect(BacktraceClient.instance).toBeUndefined();

        const replacement = BacktraceClient.initialize(options, (builder: BacktraceCoreClientBuilder) =>
            builder.useFileSystem(mockStreamFileSystem()),
        );

        expect(replacement).not.toBe(first);
        expect(replacement.enabled).toBe(true);
        expect(BacktraceClient.instance).toBe(replacement);
    });

    it('Should retain the current singleton and its console capture when an older client is disposed again', () => {
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
        const first = BacktraceClient.initialize(options, (builder: BacktraceCoreClientBuilder) =>
            builder.useFileSystem(mockStreamFileSystem()),
        );
        first.dispose();
        const replacement = BacktraceClient.initialize(options, (builder: BacktraceCoreClientBuilder) =>
            builder.useFileSystem(mockStreamFileSystem()),
        );
        const breadcrumbs = replacement.breadcrumbs;
        assert(breadcrumbs);
        const addBreadcrumb = jest.spyOn(breadcrumbs, 'addBreadcrumb');
        const installedConsoleHandler = console.log;

        first.dispose();

        expect(BacktraceClient.instance).toBe(replacement);
        expect(replacement.enabled).toBe(true);
        expect(BacktraceClient.initialize(options)).toBe(replacement);
        expect(console.log).toBe(installedConsoleHandler);
        console.log('replacement console breadcrumb');
        expect(addBreadcrumb).toHaveBeenCalledWith(
            'replacement console breadcrumb',
            expect.any(Number),
            BreadcrumbType.Log,
        );
    });

    it('Should allow retrying disposal after a module fails and then initialize a fresh client', () => {
        const failure = new Error('temporary disposal failure');
        const disposeModule = jest.fn().mockImplementationOnce(() => {
            throw failure;
        });
        const first = BacktraceClient.initialize(options, (builder: BacktraceCoreClientBuilder) =>
            builder.useFileSystem(mockStreamFileSystem()).useModule({ dispose: disposeModule }),
        );

        expect(() => first.dispose()).toThrow(failure);
        expect(first.enabled).toBe(false);
        expect(BacktraceClient.instance).toBe(first);
        expect(disposeModule).toHaveBeenCalledTimes(1);

        expect(() => first.dispose()).not.toThrow();
        expect(disposeModule).toHaveBeenCalledTimes(2);
        expect(BacktraceClient.instance).toBeUndefined();
        const replacement = BacktraceClient.initialize(options, (builder: BacktraceCoreClientBuilder) =>
            builder.useFileSystem(mockStreamFileSystem()),
        );
        expect(replacement).not.toBe(first);
        expect(replacement.enabled).toBe(true);
        expect(BacktraceClient.instance).toBe(replacement);
    });

    it('Should submit the retained breadcrumb contents after rotating the files', async () => {
        const fileSystem = mockStreamFileSystem();
        const postError = jest
            .spyOn(ReactNativeRequestHandler.prototype, 'postError')
            .mockResolvedValue(BacktraceReportSubmissionResult.Ok({}));
        const client = BacktraceClient.initialize(
            {
                ...options,
                // Keep the submitted report from adding an automatic breadcrumb while we inspect the files.
                breadcrumbs: { ...options.breadcrumbs, eventType: BreadcrumbType.Manual },
            },
            (builder: BacktraceCoreClientBuilder) => builder.useFileSystem(fileSystem),
        );

        // Enough breadcrumbs to rotate the breadcrumb files at least once.
        for (let i = 0; i < 20; i++) {
            client.breadcrumbs?.info(`breadcrumb-${i}`);
            await nextTick();
        }
        for (let i = 0; i < 10; i++) {
            await nextTick();
        }

        await client.send(new Error('report with breadcrumbs'));

        expect(postError).toHaveBeenCalledTimes(1);
        const submission = postError.mock.calls[0];
        assert(submission);
        const [, json, submittedAttachments] = submission;
        const reportAttachments: BacktraceAttachment[] = submittedAttachments;
        const attachments = reportAttachments.filter(
            (attachment): attachment is InstanceType<typeof BacktraceFileAttachment> =>
                attachment instanceof BacktraceFileAttachment,
        );
        expect(attachments).toHaveLength(2);
        const breadcrumbs = attachments.flatMap((attachment): Breadcrumb[] => {
            const location = attachment.get();
            expect(location).toEqual({
                uri: attachment.filePath,
                filepath: attachment.filePath,
                name: attachment.name,
                filename: attachment.name,
                type: 'application/json',
            });
            return fileSystem
                .readFileSync(attachment.filePath)
                .trim()
                .split('\n')
                .map((line) => JSON.parse(line));
        });
        expect(breadcrumbs.map((breadcrumb) => breadcrumb.message)).toEqual([
            'breadcrumb-16',
            'breadcrumb-17',
            'breadcrumb-18',
            'breadcrumb-19',
        ]);
        expect(JSON.parse(json).attributes['breadcrumbs.lastId']).toBe(breadcrumbs[3]?.id);
        expect(JSON.parse(json).agentVersion).toBe(packageVersion);
    });
});
