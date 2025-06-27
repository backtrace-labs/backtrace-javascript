import { BacktraceDatabaseConfiguration, BacktraceReportSubmissionResult } from '../../src/index.js';
import { BacktraceDatabase } from '../../src/modules/database/BacktraceDatabase.js';
import { mockBacktraceStorage } from '../_mocks/storage.js';
import { BacktraceTestClient } from '../mocks/BacktraceTestClient.js';

describe('Database send tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    const testDatabaseSettings: BacktraceDatabaseConfiguration = {
        enable: true,
        autoSend: false,
    };

    describe('Flush', () => {
        it('Should flush every record from the database even if the submission was unsuccessful', async () => {
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
                mockBacktraceStorage(),
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
                mockBacktraceStorage(),
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
                mockBacktraceStorage(),
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
