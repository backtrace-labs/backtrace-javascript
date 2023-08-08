import path from 'path';
import { BacktraceData, BacktraceDatabaseRecord, BacktraceReportSubmissionResult } from '../../src';
import { BacktraceDatabase } from '../../src/modules/database/BacktraceDatabase';
import { BacktraceTestClient } from '../mocks/BacktraceTestClient';
import { testStorageProvider } from '../mocks/testStorageProvider';

describe('Database context memory storage tests', () => {
    const testDatabaseSettings = {
        enabled: true,
        autoSend: false,
        // this option doesn't matter because we mock the database provider
        // interface. However, if bug happen we want to be sure to not create
        // anything. Instead we want to fail loud and hard.
        createDatabaseDirectory: false,
        path: path.join(__dirname, 'database'),
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
                testStorageProvider,
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
                testStorageProvider,
            );
            const database = client.database as BacktraceDatabase;
            if (!database) {
                throw new Error('Invalid database setup. Database must be defined!');
            }

            jest.spyOn(client.requestHandler, 'postError').mockResolvedValue(
                Promise.resolve(BacktraceReportSubmissionResult.Ok({})),
            );

            await client.send(new Error(testingErrorMessage));

            const records = database.get();

            expect(records.length).toBe(0);
            expect(testStorageProvider.add).toHaveBeenCalled();
        });
    });

    describe('Record load on the database start', () => {
        it('Shouldn not fail when no records are available in the database dir', () => {
            jest.spyOn(testStorageProvider, 'start').mockReturnValue(true);
            jest.spyOn(testStorageProvider, 'get').mockResolvedValue(Promise.resolve([]));
            const client = BacktraceTestClient.buildFakeClient(
                {
                    database: testDatabaseSettings,
                },
                [],
                [],
                testStorageProvider,
            );

            expect((client.database as BacktraceDatabase).get().length).toBe(0);
        });

        it('Should load records from the storage provider to context', async () => {
            const record: BacktraceDatabaseRecord = {
                attachments: [],
                count: 1,
                data: {} as BacktraceData,
                hash: '',
                id: '123',
                locked: false,
            };
            jest.spyOn(testStorageProvider, 'start').mockReturnValue(true);
            jest.spyOn(testStorageProvider, 'get').mockResolvedValue(Promise.resolve([record]));
            const client = BacktraceTestClient.buildFakeClient(
                {
                    database: testDatabaseSettings,
                },
                [],
                [],
                testStorageProvider,
            );
            await new Promise(process.nextTick);

            const [databaseRecord] = (client.database as BacktraceDatabase).get();
            expect(databaseRecord).toStrictEqual(record);
        });
    });
});
