import path from 'path';
import {
    BacktraceAttachment,
    BacktraceData,
    BacktraceReportSubmissionResult,
    BacktraceRequestHandler,
    BacktraceSubmitResponse,
} from '../../src/index.js';
import { RequestBacktraceReportSubmission } from '../../src/model/http/BacktraceReportSubmission.js';
import { BacktraceDatabase } from '../../src/modules/database/BacktraceDatabase.js';
import { SessionFiles } from '../../src/modules/storage/SessionFiles.js';
import { mockFileSystem } from '../_mocks/fileSystem.js';
import {
    APPLICATION,
    APPLICATION_VERSION,
    BacktraceTestClient,
    TEST_SUBMISSION_URL,
} from '../mocks/BacktraceTestClient.js';
import { testHttpClient } from '../mocks/testHttpClient.js';
import { getTestStorageProvider } from '../mocks/testStorageProvider.js';

const DATABASE_PATH = path.resolve('/backtrace');
const PREVIOUS_SESSION_MARKER = path.join(DATABASE_PATH, 'bt-session_previous_1000');
const PREVIOUS_SESSION_BREADCRUMBS = path.join(DATABASE_PATH, 'bt-breadcrumbs-0_previous_1000');
const STORED_RECORD = path.join(DATABASE_PATH, 'stored-report-record.json');

function flush() {
    return new Promise((resolve) => setImmediate(resolve));
}

async function waitFor(condition: () => boolean) {
    for (let i = 0; i < 100 && !condition(); i++) {
        await flush();
    }
}

function storedReportFileSystem() {
    const fileSystem = mockFileSystem({
        [PREVIOUS_SESSION_MARKER]: '',
        [PREVIOUS_SESSION_BREADCRUMBS]: 'breadcrumbs',
        [STORED_RECORD]: JSON.stringify({
            type: 'report',
            id: 'stored-report',
            timestamp: 1000,
            locked: false,
            data: { uuid: 'stored-report-uuid' },
            sessionId: { id: 'previous', timestamp: 1000 },
            attachments: [{ filePath: PREVIOUS_SESSION_BREADCRUMBS, name: 'bt-breadcrumbs-0' }],
        }),
    });

    fileSystem.createAttachment.mockImplementation((filePath: string, name?: string) => ({
        filePath,
        name: name ?? path.basename(filePath),
        get: () => fileSystem.files[path.resolve(filePath)],
    }));

    return fileSystem;
}

function uploadingRequestHandler(failedUploads = 0) {
    const uploads: string[][] = [];
    const handler: BacktraceRequestHandler = {
        post: jest.fn(),
        postError: jest.fn(async (_url: string, _json: string, attachments: BacktraceAttachment[]) => {
            const parts = attachments.filter((attachment) => attachment.get() !== undefined);
            // React Native reads file parts after the request starts.
            await flush();
            const uploaded = parts.filter((attachment) => attachment.get() !== undefined);
            uploads.push(uploaded.map((attachment) => attachment.name));

            if (uploaded.length !== parts.length || uploads.length <= failedUploads) {
                return BacktraceReportSubmissionResult.OnNetworkingError<BacktraceSubmitResponse>('upload failed');
            }

            return BacktraceReportSubmissionResult.Ok({} as BacktraceSubmitResponse);
        }),
    };

    return { handler, uploads };
}

function startClient(fileSystem: ReturnType<typeof mockFileSystem>, handler: BacktraceRequestHandler) {
    const client = new BacktraceTestClient(
        {
            userAttributes: { application: APPLICATION, 'application.version': APPLICATION_VERSION },
            database: {
                enable: true,
                autoSend: true,
                createDatabaseDirectory: false,
                path: DATABASE_PATH,
            },
        },
        handler,
        [],
        [],
        fileSystem,
    );
    client.initialize();
    return client;
}

describe('Database session files tests', () => {
    let client: BacktraceTestClient | undefined;

    afterEach(() => {
        client?.dispose();
        client = undefined;
    });

    it('Should keep the session files of a stored report until the report is sent', async () => {
        const fileSystem = storedReportFileSystem();
        const { handler, uploads } = uploadingRequestHandler();

        client = startClient(fileSystem, handler);
        await waitFor(() => uploads.length === 1);
        await flush();

        expect(uploads).toEqual([['bt-breadcrumbs-0']]);
        expect(fileSystem.existsSync(STORED_RECORD)).toBe(false);
        expect(fileSystem.existsSync(PREVIOUS_SESSION_BREADCRUMBS)).toBe(false);
        expect(fileSystem.existsSync(PREVIOUS_SESSION_MARKER)).toBe(false);
    });

    it('Should keep the session files of a stored report after a failed send', async () => {
        const fileSystem = storedReportFileSystem();
        const { handler, uploads } = uploadingRequestHandler(1);

        client = startClient(fileSystem, handler);
        await waitFor(() => uploads.length === 1);
        await flush();

        expect(fileSystem.existsSync(PREVIOUS_SESSION_BREADCRUMBS)).toBe(true);

        await client.database?.send();

        expect(uploads).toEqual([['bt-breadcrumbs-0'], ['bt-breadcrumbs-0']]);
        expect(fileSystem.existsSync(PREVIOUS_SESSION_BREADCRUMBS)).toBe(false);
    });

    it('Should not lock the current session for a report added in it', () => {
        const fileSystem = mockFileSystem();
        new SessionFiles(fileSystem, DATABASE_PATH, { id: 'previous', timestamp: 1000 }).initialize();
        const sessionFiles = new SessionFiles(fileSystem, DATABASE_PATH, { id: 'current', timestamp: 2000 });
        sessionFiles.initialize();
        const lock = jest.spyOn(sessionFiles, 'lock');

        const database = new BacktraceDatabase(
            { enable: true, autoSend: false, path: DATABASE_PATH },
            getTestStorageProvider(),
            new RequestBacktraceReportSubmission({ url: TEST_SUBMISSION_URL }, testHttpClient),
            sessionFiles,
        );
        database.initialize();
        const record = database.add({ uuid: 'current-report-uuid' } as BacktraceData, []);

        expect(record?.sessionId).toEqual(sessionFiles.sessionId);
        expect(lock).not.toHaveBeenCalled();
    });
});
