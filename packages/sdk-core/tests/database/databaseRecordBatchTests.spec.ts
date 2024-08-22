import path from 'path';
import { fileURLToPath } from 'url';
import { BacktraceReportSubmissionResult } from '../../src';
import { mockFileSystem } from '../_mocks/fileSystem';
import { BacktraceTestClient } from '../mocks/BacktraceTestClient';
import { testHttpClient } from '../mocks/testHttpClient';

jest.useFakeTimers();

describe('Database record batch tests', () => {
    beforeEach(() => {
        jest.setTimeout(60_000);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });
    it('Should delete batch of reports on maximumRetries unsuccessful tries', async () => {
        jest.spyOn(testHttpClient, 'postError').mockResolvedValue(
            Promise.resolve(BacktraceReportSubmissionResult.OnInternalServerError('test error')),
        );
        const maximumRetries = 3;
        const retryInterval = 1000;
        const client = BacktraceTestClient.buildFakeClient(
            {
                database: {
                    enable: true,
                    autoSend: true,
                    path: path.join(path.dirname(fileURLToPath(import.meta.url)), 'database'),
                    maximumRetries,
                    retryInterval: 1000,
                },
            },
            [],
            [],
            mockFileSystem(),
        );
        const database = client.database;
        if (!database) {
            throw new Error('Invalid database setup. Database must be defined!');
        }

        await client.send(new Error('test'));
        expect(database.get().length).toEqual(1);

        await jest.advanceTimersByTimeAsync(maximumRetries * retryInterval + 1);

        expect(database.get().length).toEqual(0);
    });

    it('Should not remove the report from the context after less than maximumRetries failures', async () => {
        jest.spyOn(testHttpClient, 'postError').mockResolvedValue(
            Promise.resolve(BacktraceReportSubmissionResult.OnInternalServerError('test error')),
        );
        const maximumRetries = 3;
        const retryInterval = 1000;
        const client = BacktraceTestClient.buildFakeClient(
            {
                database: {
                    enable: true,
                    autoSend: true,
                    path: path.join(path.dirname(fileURLToPath(import.meta.url)), 'database'),
                    maximumRetries,
                    retryInterval: 1000,
                },
            },
            [],
            [],
            mockFileSystem(),
        );
        const database = client.database;
        if (!database) {
            throw new Error('Invalid database setup. Database must be defined!');
        }

        await client.send(new Error('test'));
        expect(database.get().length).toEqual(1);

        // less than retry intervals
        await jest.advanceTimersByTimeAsync(retryInterval);

        expect(database.get().length).toEqual(1);
    });
});
