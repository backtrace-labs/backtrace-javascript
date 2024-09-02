import path from 'path';
import { fileURLToPath } from 'url';
import { BacktraceReportSubmissionResult } from '../../src/index.js';
import { BacktraceDatabase } from '../../src/modules/database/BacktraceDatabase.js';
import { mockFileSystem } from '../_mocks/fileSystem.js';
import { BacktraceTestClient } from '../mocks/BacktraceTestClient.js';
describe('Database storage provider flow tests', () => {
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
