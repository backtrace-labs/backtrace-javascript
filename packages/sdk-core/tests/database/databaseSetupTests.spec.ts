import crypto from 'crypto';
import { nextTick } from 'process';
import { promisify } from 'util';
import { AttachmentBacktraceDatabaseRecord, BacktraceData, ReportBacktraceDatabaseRecord } from '../../src/index.js';
import { RequestBacktraceReportSubmission } from '../../src/model/http/BacktraceReportSubmission.js';
import { BacktraceDatabase } from '../../src/modules/database/BacktraceDatabase.js';
import { BacktraceDatabaseContext } from '../../src/modules/database/BacktraceDatabaseContext.js';
import { TEST_SUBMISSION_URL } from '../mocks/BacktraceTestClient.js';
import { testHttpClient } from '../mocks/testHttpClient.js';
import { getTestStorageProvider } from '../mocks/testStorageProvider.js';

function randomReportRecord(): ReportBacktraceDatabaseRecord {
    return {
        id: crypto.randomUUID(),
        type: 'report',
        data: { uuid: crypto.randomUUID() } as BacktraceData,
        locked: false,
        attachments: [],
        timestamp: Date.now(),
    };
}

function randomAttachmentRecord(): AttachmentBacktraceDatabaseRecord {
    return {
        id: crypto.randomUUID(),
        type: 'attachment',
        locked: false,
        timestamp: Date.now(),
        attachment: { name: 'x', get: () => undefined },
        rxid: 'x',
        sessionId: crypto.randomUUID(),
    };
}

describe('Database setup tests', () => {
    it('The database should be disabled by default', () => {
        const testStorageProvider = getTestStorageProvider();
        const database = new BacktraceDatabase(
            undefined,
            testStorageProvider,
            new RequestBacktraceReportSubmission(
                {
                    url: TEST_SUBMISSION_URL,
                },
                testHttpClient,
            ),
        );

        expect(database.enabled).toBeFalsy();
    });

    it('Should be enabled after returning true from the start method', () => {
        const testStorageProvider = getTestStorageProvider();
        const database = new BacktraceDatabase(
            {
                autoSend: false,
            },
            testStorageProvider,
            new RequestBacktraceReportSubmission(
                {
                    url: TEST_SUBMISSION_URL,
                },
                testHttpClient,
            ),
        );

        const databaseStartResult = database.initialize();

        expect(databaseStartResult).toBeTruthy();
        expect(database.enabled).toBeTruthy();
    });

    it('Should not enable the database if the enable option is set to false', () => {
        const testStorageProvider = getTestStorageProvider();
        const database = new BacktraceDatabase(
            { enable: false },
            testStorageProvider,
            new RequestBacktraceReportSubmission(
                {
                    url: TEST_SUBMISSION_URL,
                },
                testHttpClient,
            ),
        );

        const databaseStartResult = database.initialize();

        expect(databaseStartResult).toBeFalsy();
        expect(database.enabled).toBeFalsy();
    });

    it('Should not enable the database if the storage is not prepared', () => {
        const testStorageProvider = getTestStorageProvider();
        const database = new BacktraceDatabase(
            {
                enable: true,
                path: '/path/to/fake/dir',
            },
            testStorageProvider,
            new RequestBacktraceReportSubmission(
                {
                    url: TEST_SUBMISSION_URL,
                },
                testHttpClient,
            ),
        );
        jest.spyOn(testStorageProvider, 'start').mockReturnValue(false);

        const databaseStartResult = database.initialize();

        expect(databaseStartResult).toBeFalsy();
        expect(database.enabled).toBeFalsy();
    });

    it('Should be disabled after disposing database', () => {
        const testStorageProvider = getTestStorageProvider();
        const database = new BacktraceDatabase(
            undefined,
            testStorageProvider,
            new RequestBacktraceReportSubmission(
                {
                    url: TEST_SUBMISSION_URL,
                },
                testHttpClient,
            ),
        );

        database.initialize();
        database.dispose();

        expect(database.enabled).toBeFalsy();
    });

    it('Should not add a record to disabled database', () => {
        const testStorageProvider = getTestStorageProvider();
        const database = new BacktraceDatabase(
            undefined,
            testStorageProvider,
            new RequestBacktraceReportSubmission(
                {
                    url: TEST_SUBMISSION_URL,
                },
                testHttpClient,
            ),
        );

        const result = database.add({} as BacktraceData, []);
        expect(result).toBeFalsy();
    });

    it('should add reports from storage on initialize', async () => {
        const testStorageProvider = getTestStorageProvider();
        const reports = [randomReportRecord(), randomReportRecord(), randomReportRecord()];
        testStorageProvider.get.mockResolvedValue(reports);

        const contextLoad = jest.spyOn(BacktraceDatabaseContext.prototype, 'load');

        const database = new BacktraceDatabase(
            {
                autoSend: false,
            },
            testStorageProvider,
            new RequestBacktraceReportSubmission(
                {
                    url: TEST_SUBMISSION_URL,
                },
                testHttpClient,
            ),
        );

        const databaseStartResult = database.initialize();

        const nextTickAsync = promisify(nextTick);
        await nextTickAsync();

        expect(databaseStartResult).toBeTruthy();
        expect(database.enabled).toBeTruthy();

        expect(contextLoad).toHaveBeenCalledWith(reports);
    });

    it('should add no more than maximumNumberOfRecords reports from storage on initialize', async () => {
        const testStorageProvider = getTestStorageProvider();
        const reports = [randomReportRecord(), randomReportRecord(), randomReportRecord()];
        const expected = reports.slice(0, 2);
        testStorageProvider.get.mockResolvedValue(reports);

        const contextLoad = jest.spyOn(BacktraceDatabaseContext.prototype, 'load');

        const database = new BacktraceDatabase(
            {
                autoSend: false,
                maximumNumberOfRecords: 2,
            },
            testStorageProvider,
            new RequestBacktraceReportSubmission(
                {
                    url: TEST_SUBMISSION_URL,
                },
                testHttpClient,
            ),
        );

        const databaseStartResult = database.initialize();

        const nextTickAsync = promisify(nextTick);
        await nextTickAsync();

        expect(databaseStartResult).toBeTruthy();
        expect(database.enabled).toBeTruthy();

        expect(contextLoad).toHaveBeenCalledWith(expected);
    });

    it('should limit report records by maximumNumberOfRecords and attachment records by maximumNumberOfAttachmentRecords', async () => {
        const testStorageProvider = getTestStorageProvider();
        const reports = [
            randomReportRecord(),
            randomAttachmentRecord(),
            randomReportRecord(),
            randomAttachmentRecord(),
            randomReportRecord(),
            randomAttachmentRecord(),
            randomReportRecord(),
            randomAttachmentRecord(),
            randomReportRecord(),
            randomAttachmentRecord(),
            randomReportRecord(),
            randomAttachmentRecord(),
        ];

        const expected = [reports[0], reports[1], reports[2], reports[3], reports[5]];
        testStorageProvider.get.mockResolvedValue(reports);

        const contextLoad = jest.spyOn(BacktraceDatabaseContext.prototype, 'load');

        const database = new BacktraceDatabase(
            {
                autoSend: false,
                maximumNumberOfRecords: 2,
                maximumNumberOfAttachmentRecords: 3,
            },
            testStorageProvider,
            new RequestBacktraceReportSubmission(
                {
                    url: TEST_SUBMISSION_URL,
                },
                testHttpClient,
            ),
        );

        const databaseStartResult = database.initialize();

        const nextTickAsync = promisify(nextTick);
        await nextTickAsync();

        expect(databaseStartResult).toBeTruthy();
        expect(database.enabled).toBeTruthy();

        expect(contextLoad).toHaveBeenCalledWith(expected);
    });
});
