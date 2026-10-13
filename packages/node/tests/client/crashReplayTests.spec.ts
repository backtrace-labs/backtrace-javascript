import {
    BacktraceAttachment,
    BacktraceReportSubmissionResult,
    BacktraceRequestHandler,
    BacktraceSubmitResponse,
} from '@backtrace/sdk-core';
import path from 'path';
import { BacktraceClient } from '../../src/BacktraceClient.js';
import { mockStreamFileSystem } from '../_mocks/fileSystem.js';

const DATABASE_PATH = path.resolve('/backtrace');
const PREVIOUS_SESSION_BREADCRUMBS = path.join(DATABASE_PATH, 'bt-breadcrumbs-0_previous_1000');

function flush() {
    return new Promise((resolve) => setImmediate(resolve));
}

async function waitFor(condition: () => boolean) {
    for (let i = 0; i < 100 && !condition(); i++) {
        await flush();
    }
}

describe('Crash replay tests', () => {
    const processReport = process.report as NodeJS.ProcessReport;
    const reportOnFatalError = processReport.reportOnFatalError;
    const reportDirectory = processReport.directory;
    const reportFilename = processReport.filename;
    let client: BacktraceClient | undefined;

    afterEach(() => {
        client?.dispose();
        client = undefined;
        processReport.reportOnFatalError = reportOnFatalError;
        processReport.directory = reportDirectory;
        processReport.filename = reportFilename;
    });

    it('Should keep the breadcrumbs of a crash from the previous session after a failed send', async () => {
        const fileSystem = mockStreamFileSystem({
            [path.join(DATABASE_PATH, 'bt-session_previous_1000')]: '',
            [PREVIOUS_SESSION_BREADCRUMBS]: 'breadcrumbs',
            [path.join(DATABASE_PATH, 'report.1.json')]: JSON.stringify(processReport.getReport()),
        });
        processReport.directory = DATABASE_PATH;
        processReport.filename = '';

        const uploads: string[][] = [];
        const requestHandler: BacktraceRequestHandler = {
            post: jest.fn(),
            postError: jest.fn(async (_url: string, _json: string, attachments: BacktraceAttachment[]) => {
                uploads.push(attachments.filter((attachment) => attachment.get() !== undefined).map((a) => a.name));
                return uploads.length === 1
                    ? BacktraceReportSubmissionResult.OnNetworkingError<BacktraceSubmitResponse>('offline')
                    : BacktraceReportSubmissionResult.Ok({} as BacktraceSubmitResponse);
            }),
        };

        client = new BacktraceClient({
            options: {
                url: 'https://submit.backtrace.io/foo/bar/baz',
                userAttributes: { application: 'test-app', 'application.version': '1.0.0' },
                captureUnhandledErrors: false,
                captureUnhandledPromiseRejections: false,
                metrics: { enable: false },
                breadcrumbs: { enable: false },
                database: {
                    enable: true,
                    autoSend: false,
                    captureNativeCrashes: true,
                    createDatabaseDirectory: false,
                    path: DATABASE_PATH,
                },
            },
            fileSystem,
            requestHandler,
        });
        client.initialize();
        await waitFor(() => uploads.length === 1);
        await flush();

        expect(fileSystem.existsSync(PREVIOUS_SESSION_BREADCRUMBS)).toBe(true);

        await client.database?.send();

        expect(uploads).toEqual([['bt-breadcrumbs-0_previous_1000'], ['bt-breadcrumbs-0_previous_1000']]);
        expect(fileSystem.existsSync(PREVIOUS_SESSION_BREADCRUMBS)).toBe(false);
    });
});
