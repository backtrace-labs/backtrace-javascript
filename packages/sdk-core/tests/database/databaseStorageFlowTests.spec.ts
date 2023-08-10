import path from 'path';
import { BacktraceReportSubmissionResult } from '../../src';
import { BacktraceDatabase } from '../../src/modules/database/BacktraceDatabase';
import { BacktraceTestClient } from '../mocks/BacktraceTestClient';
import { testDatabaseSetup } from '../mocks/testStorageProvider';

describe('Database storage provider flow tests', () => {
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

    describe('Setup', () => {
        it('Should initialize correctly after database storage initialization', () => {
            const client = BacktraceTestClient.buildFakeClient(
                {
                    database: testDatabaseSettings,
                },
                [],
                [],
                testDatabaseSetup,
            );
            const database = client.database as BacktraceDatabase;
            if (!database) {
                throw new Error('Invalid database setup. Database must be defined!');
            }

            expect(testDatabaseSetup.storageProvider.start).toHaveBeenCalled();
            expect(database.enabled).toBeTruthy();
        });

        it('Should not initialize if storage is not setup correctly', () => {
            jest.spyOn(testDatabaseSetup.storageProvider, 'start').mockReturnValueOnce(false);
            const client = BacktraceTestClient.buildFakeClient(
                {
                    database: testDatabaseSettings,
                },
                [],
                [],
                testDatabaseSetup,
            );
            const database = client.database as BacktraceDatabase;
            if (!database) {
                throw new Error('Invalid database setup. Database must be defined!');
            }

            expect(testDatabaseSetup.storageProvider.start).toHaveBeenCalled();
            expect(database.enabled).toBeFalsy();
        });
    });

    describe('Add', () => {
        it('Should call add on client.send method', async () => {
            const testingErrorMessage = 'testingErrorMessage';
            const client = BacktraceTestClient.buildFakeClient(
                {
                    database: testDatabaseSettings,
                },
                [],
                [],
                testDatabaseSetup,
            );
            const database = client.database as BacktraceDatabase;
            if (!database) {
                throw new Error('Invalid database setup. Database must be defined!');
            }

            jest.spyOn(client.requestHandler, 'postError').mockResolvedValue(
                Promise.resolve(BacktraceReportSubmissionResult.OnInternalServerError('test')),
            );

            await client.send(new Error(testingErrorMessage));

            expect(testDatabaseSetup.storageProvider.add).toHaveBeenCalled();
            expect(testDatabaseSetup.storageProvider.delete).not.toHaveBeenCalled();
        });

        it('Should call delete after successful client.send', async () => {
            const testingErrorMessage = 'testingErrorMessage';
            const client = BacktraceTestClient.buildFakeClient(
                {
                    database: testDatabaseSettings,
                },
                [],
                [],
                testDatabaseSetup,
            );
            const database = client.database as BacktraceDatabase;
            if (!database) {
                throw new Error('Invalid database setup. Database must be defined!');
            }

            jest.spyOn(client.requestHandler, 'postError').mockResolvedValue(
                Promise.resolve(BacktraceReportSubmissionResult.Ok({})),
            );

            await client.send(new Error(testingErrorMessage));

            expect(testDatabaseSetup.storageProvider.add).toHaveBeenCalled();
            expect(testDatabaseSetup.storageProvider.delete).toHaveBeenCalled();
        });
    });
});
