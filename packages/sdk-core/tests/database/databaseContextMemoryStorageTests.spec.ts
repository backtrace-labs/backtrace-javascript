import assert from 'assert';
import { TimeHelper } from '../../src/common/TimeHelper.js';
import {
    BacktraceData,
    BacktraceDatabaseConfiguration,
    BacktraceReportSubmissionResult,
    ReportBacktraceDatabaseRecord,
} from '../../src/index.js';
import { BacktraceDatabase } from '../../src/modules/database/BacktraceDatabase.js';
import { mockBacktraceStorage } from '../_mocks/storage.js';
import { BacktraceTestClient } from '../mocks/BacktraceTestClient.js';

describe('Database context memory storage tests', () => {
    const testDatabaseSettings: BacktraceDatabaseConfiguration = {
        enable: true,
        autoSend: false,
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Adding reports to the database via client API', () => {
        it('Should add report to the database via client send method', async () => {
            const testingErrorMessage = 'testingErrorMessage';
            const client = BacktraceTestClient.buildFakeClient(
                {
                    database: testDatabaseSettings,
                },
                [],
                [],
                mockBacktraceStorage(),
            );
            const database = client.database as BacktraceDatabase;
            if (!database) {
                throw new Error('Invalid database setup. Database must be defined!');
            }

            jest.spyOn(client.requestHandler, 'postError').mockResolvedValue(
                Promise.resolve(BacktraceReportSubmissionResult.OnInternalServerError('test')),
            );

            await client.send(new Error(testingErrorMessage));

            const records = database.get();

            expect(records.length).toBe(1);
            assert(records[0].type === 'report');
            expect((records[0] as ReportBacktraceDatabaseRecord).data.attributes['error.message']).toEqual(
                testingErrorMessage,
            );
        });

        it('Should remove report from the database after succesful submission', async () => {
            const testingErrorMessage = 'testingErrorMessage';
            const client = BacktraceTestClient.buildFakeClient(
                {
                    database: testDatabaseSettings,
                },
                [],
                [],
                mockBacktraceStorage(),
            );
            const database = client.database as BacktraceDatabase;
            if (!database) {
                throw new Error('Invalid database setup. Database must be defined!');
            }

            const removeSpy = jest.spyOn(database, 'remove');

            jest.spyOn(client.requestHandler, 'postError').mockResolvedValue(
                Promise.resolve(BacktraceReportSubmissionResult.Ok({})),
            );

            await client.send(new Error(testingErrorMessage));

            const records = database.get();

            expect(records.length).toBe(0);
            expect(removeSpy).toHaveBeenCalled();
        });
    });

    describe('Record load on the database start', () => {
        it('Shouldn not fail when no records are available in the database dir', () => {
            const fileSystem = mockBacktraceStorage();

            const client = BacktraceTestClient.buildFakeClient(
                {
                    database: testDatabaseSettings,
                },
                [],
                [],
                fileSystem,
            );

            expect((client.database as BacktraceDatabase).get().length).toBe(0);
        });

        it('Should load records from the storage provider to context', async () => {
            const record: ReportBacktraceDatabaseRecord = {
                type: 'report',
                timestamp: TimeHelper.now(),
                data: {} as BacktraceData,
                id: '123',
                locked: false,
            };
            const fileSystem = mockBacktraceStorage({
                ['abc-record.json']: JSON.stringify(record),
            });
            const client = BacktraceTestClient.buildFakeClient(
                {
                    database: testDatabaseSettings,
                },
                [],
                [],
                fileSystem,
            );
            await new Promise(process.nextTick);

            const [databaseRecord] = (client.database as BacktraceDatabase).get();
            expect(databaseRecord).toStrictEqual(record);
        });
    });
});
