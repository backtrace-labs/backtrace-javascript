import path from 'path';
import { fileURLToPath } from 'url';
import { TimeHelper } from '../../src/common/TimeHelper.js';
import { BacktraceData, BacktraceDatabaseRecord, BacktraceReportSubmissionResult } from '../../src/index.js';
import { BacktraceDatabase } from '../../src/modules/database/BacktraceDatabase.js';
import { mockFileSystem } from '../_mocks/fileSystem.js';
import { BacktraceTestClient } from '../mocks/BacktraceTestClient.js';

describe('Database context memory storage tests', () => {
    const testDatabaseSettings = {
        enable: true,
        autoSend: false,
        // this option doesn't matter because we mock the database provider
        // interface. However, if bug happen we want to be sure to not create
        // anything. Instead we want to fail loud and hard.
        createDatabaseDirectory: false,
        path: path.join(path.dirname(fileURLToPath(import.meta.url)), 'database'),
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
                mockFileSystem(),
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
            expect(records[0].data.attributes['error.message']).toEqual(testingErrorMessage);
        });

        it('Should remove report from the database after succesful submission', async () => {
            const testingErrorMessage = 'testingErrorMessage';
            const client = BacktraceTestClient.buildFakeClient(
                {
                    database: testDatabaseSettings,
                },
                [],
                [],
                mockFileSystem(),
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
            const fileSystem = mockFileSystem();

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
            const record: BacktraceDatabaseRecord = {
                attachments: [],
                timestamp: TimeHelper.now(),
                count: 1,
                data: {} as BacktraceData,
                hash: '',
                id: '123',
                locked: false,
            };
            const fileSystem = mockFileSystem({
                [path.join(testDatabaseSettings.path, 'abc-record.json')]: JSON.stringify(record),
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
