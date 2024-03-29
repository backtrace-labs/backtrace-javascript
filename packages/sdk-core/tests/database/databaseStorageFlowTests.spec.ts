import path from 'path';
import { BacktraceReportSubmissionResult } from '../../src';
import { BacktraceDatabase } from '../../src/modules/database/BacktraceDatabase';
import { mockFileSystem } from '../_mocks/fileSystem';
import { BacktraceTestClient } from '../mocks/BacktraceTestClient';

describe('Database storage provider flow tests', () => {
    const testDatabaseSettings = {
        enable: true,
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

    describe('Add', () => {
        it('Should call add on client.send method', async () => {
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

            const addSpy = jest.spyOn(database, 'add');

            jest.spyOn(client.requestHandler, 'postError').mockResolvedValue(
                Promise.resolve(BacktraceReportSubmissionResult.OnInternalServerError('test')),
            );

            await client.send(new Error(testingErrorMessage));

            expect(addSpy).toHaveBeenCalled();
        });

        it('Should call delete after successful client.send', async () => {
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

            const addSpy = jest.spyOn(database, 'add');
            const removeSpy = jest.spyOn(database, 'remove');

            jest.spyOn(client.requestHandler, 'postError').mockResolvedValue(
                Promise.resolve(BacktraceReportSubmissionResult.Ok({})),
            );

            await client.send(new Error(testingErrorMessage));

            expect(addSpy).toHaveBeenCalled();
            expect(removeSpy).toHaveBeenCalled();
        });
    });
});
