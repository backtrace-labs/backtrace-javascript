import path from 'path';
import { BacktraceDatabaseConfiguration, BacktraceReportSubmissionResult } from '../../src';
import { BacktraceDatabase } from '../../src/modules/database/BacktraceDatabase';
import { BacktraceTestClient } from '../mocks/BacktraceTestClient';
import { testStorageProvider } from '../mocks/testStorageProvider';

describe('Database send tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    const testDatabaseSettings: BacktraceDatabaseConfiguration = {
        enable: true,
        autoSend: false,
        // this option doesn't matter because we mock the database provider
        // interface. However, if bug happen we want to be sure to not create
        // anything. Instead we want to fail loud and hard.
        createDatabaseDirectory: false,
        path: path.join(__dirname, 'database'),
    };

    describe('Flush', () => {
        it('Should flush every record from the database even if the submission was unsuccessful', async () => {
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

            await client.send(new Error('foo'));

            expect(database.count()).toEqual(1);
            await database.flush();
            expect(database.count()).toEqual(0);
        });

        it('Should flush every record from the database even if submission was successful', async () => {
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

            jest.spyOn(client.requestHandler, 'postError').mockResolvedValueOnce(
                Promise.resolve(BacktraceReportSubmissionResult.OnInternalServerError('test')),
            );

            await client.send(new Error('foo'));

            expect(database.count()).toEqual(1);
            jest.spyOn(client.requestHandler, 'postError').mockResolvedValueOnce(
                Promise.resolve(BacktraceReportSubmissionResult.Ok({})),
            );
            await database.flush();
            expect(database.count()).toEqual(0);
            expect(client.requestHandler.postError).toHaveBeenCalledTimes(2);
        });
    });

    describe('Send', () => {
        it('Should send all reports available in the database', async () => {
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

            const postErrorSpy = jest
                .spyOn(client.requestHandler, 'postError')
                .mockResolvedValue(Promise.resolve(BacktraceReportSubmissionResult.OnInternalServerError('test')));

            await client.send(new Error('foo'));

            expect(database.count()).toEqual(1);
            await database.send();
            expect(database.count()).toEqual(1);
            expect(postErrorSpy).toHaveBeenCalledTimes(2);
        });

        it('Should send all reports available in the database and remove them', async () => {
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

            const postErrorSpy = jest
                .spyOn(client.requestHandler, 'postError')
                .mockResolvedValueOnce(Promise.resolve(BacktraceReportSubmissionResult.OnInternalServerError('test')));

            await client.send(new Error('foo'));

            expect(database.count()).toEqual(1);
            postErrorSpy.mockResolvedValueOnce(Promise.resolve(BacktraceReportSubmissionResult.Ok({})));
            await database.send();
            expect(database.count()).toEqual(0);
            expect(postErrorSpy).toHaveBeenCalledTimes(2);
        });
    });
});
