import { BacktraceReport, type BacktraceData } from '@backtrace/sdk-core';
import { Platform } from 'react-native';
import { AnrException } from '../src/anr/AnrException';
import { AndroidUnhandledException } from '../src/handlers/android/AndroidUnhandledException';
import { mockStreamFileSystem } from './_mocks/fileSystem';

jest.mock('react-native', () => ({
    NativeModules: {},
    Platform: {
        OS: 'android',
        select: (options: Record<string, unknown>) =>
            options.android !== undefined ? options.android : options.default,
    },
}));

jest.mock('../src/common/platformHelper', () => ({
    version: () => '0.81.6',
}));

jest.mock('../src/ReactNativeRequestHandler', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { BacktraceReportSubmissionResult } = require('@backtrace/sdk-core');
    return {
        ReactNativeRequestHandler: jest.fn().mockImplementation(() => ({
            postError: jest.fn().mockResolvedValue(BacktraceReportSubmissionResult.ReportSkipped()),
            post: jest.fn().mockResolvedValue(BacktraceReportSubmissionResult.ReportSkipped()),
        })),
    };
});

/* eslint-disable @typescript-eslint/no-var-requires */
const { BacktraceClient } = require('../src/BacktraceClient');
/* eslint-enable @typescript-eslint/no-var-requires */

const SYMBOLICATION_ID = 'f6c3e8d4-8626-4051-94ec-53e6daccce25';
const JAVA_FRAMES = [{ funcName: 'com.example.a.b', library: 'SourceFile', line: 1 }];

function createClient(proguard?: { enable?: boolean; symbolicationId?: string }) {
    const client = new BacktraceClient({
        options: {
            url: 'https://submit.backtrace.io/universe/token/json',
            captureUnhandledErrors: false,
            captureUnhandledPromiseRejections: false,
            database: { enable: false },
            metrics: { enable: false },
            breadcrumbs: { enable: false },
            userAttributes: { application: 'proguardSymbolication', 'application.version': '1.0.0' },
            proguard,
        },
        fileSystem: mockStreamFileSystem(),
    });
    client.initialize();
    return client;
}

function javaExceptionReport() {
    const report = new BacktraceReport(
        new AndroidUnhandledException('java.lang.RuntimeException', 'boom', 'java.lang.RuntimeException: boom'),
        { 'error.type': 'Unhandled exception' },
    );
    report.addStackTrace('main', JAVA_FRAMES);
    return report;
}

function anrReport() {
    const report = new BacktraceReport(new AnrException('Application Not Responding | Blocked thread detected', ''), {
        'error.type': 'Hang',
    });
    report.addStackTrace('main', JAVA_FRAMES);
    return report;
}

async function submittedData(client: InstanceType<typeof BacktraceClient>, report: BacktraceReport) {
    let submitted: BacktraceData | undefined;
    client.on('before-send', (_report: BacktraceReport, data: BacktraceData) => {
        submitted = data;
    });
    await client.send(report);
    if (!submitted) {
        throw new Error('report was not submitted');
    }
    return submitted;
}

describe('BacktraceClient proguard symbolication', () => {
    let client: InstanceType<typeof BacktraceClient>;

    afterEach(() => {
        client?.dispose();
    });

    it('Should mark unhandled Java exception reports for proguard symbolication when enabled', async () => {
        client = createClient({ enable: true, symbolicationId: SYMBOLICATION_ID });

        const data = await submittedData(client, javaExceptionReport());

        expect(data.symbolication).toEqual('proguard');
    });

    it('Should mark ANR reports for proguard symbolication when enabled', async () => {
        client = createClient({ enable: true, symbolicationId: SYMBOLICATION_ID });

        const data = await submittedData(client, anrReport());

        expect(data.symbolication).toEqual('proguard');
    });

    it('Should leave JavaScript error reports without proguard symbolication', async () => {
        client = createClient({ enable: true, symbolicationId: SYMBOLICATION_ID });

        const data = await submittedData(client, new BacktraceReport(new Error('js')));

        expect(data.symbolication).toBeUndefined();
    });

    it('Should send the configured id as the symbolication_id attribute on every report', async () => {
        client = createClient({ enable: true, symbolicationId: SYMBOLICATION_ID });

        const data = await submittedData(client, new BacktraceReport(new Error('js')));

        expect(data.attributes['symbolication_id']).toEqual(SYMBOLICATION_ID);
    });

    it('Should not mark Java reports or add the attribute when proguard is not configured', async () => {
        client = createClient();

        const data = await submittedData(client, javaExceptionReport());

        expect(data.symbolication).toBeUndefined();
        expect(data.attributes['symbolication_id']).toBeUndefined();
    });

    it('Should mark Java reports without adding the attribute when only enable is set', async () => {
        client = createClient({ enable: true });

        const data = await submittedData(client, javaExceptionReport());

        expect(data.symbolication).toEqual('proguard');
        expect(data.attributes['symbolication_id']).toBeUndefined();
    });

    it('Should not add the symbolication_id attribute on iOS', async () => {
        (Platform as { OS: string }).OS = 'ios';
        try {
            client = createClient({ enable: true, symbolicationId: SYMBOLICATION_ID });

            const data = await submittedData(client, new BacktraceReport(new Error('js')));

            expect(data.attributes['symbolication_id']).toBeUndefined();
        } finally {
            (Platform as { OS: string }).OS = 'android';
        }
    });
});
