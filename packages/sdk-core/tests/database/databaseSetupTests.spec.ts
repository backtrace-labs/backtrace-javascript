import { BacktraceData } from '../../src';
import { BacktraceReportSubmission } from '../../src/model/http/BacktraceReportSubmission';
import { BacktraceDatabase } from '../../src/modules/database/BacktraceDatabase';
import { TEST_SUBMISSION_URL } from '../mocks/BacktraceTestClient';
import { testHttpClient } from '../mocks/testHttpClient';
import { testStorageProvider } from '../mocks/testStorageProvider';

describe('Database setup tests', () => {
    it('The database should be disabled by default', () => {
        const database = new BacktraceDatabase(
            undefined,
            testStorageProvider,
            new BacktraceReportSubmission(
                {
                    url: TEST_SUBMISSION_URL,
                },
                testHttpClient,
            ),
        );

        expect(database.enabled).toBeFalsy();
    });

    it('Should be enabled after returning true from the start method', () => {
        const database = new BacktraceDatabase(
            {
                autoSend: false,
            },
            testStorageProvider,
            new BacktraceReportSubmission(
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
        const database = new BacktraceDatabase(
            { enable: false },
            testStorageProvider,
            new BacktraceReportSubmission(
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
        const database = new BacktraceDatabase(
            {
                enable: true,
                path: '/path/to/fake/dir',
            },
            testStorageProvider,
            new BacktraceReportSubmission(
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
        const database = new BacktraceDatabase(
            undefined,
            testStorageProvider,
            new BacktraceReportSubmission(
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
        const database = new BacktraceDatabase(
            undefined,
            testStorageProvider,
            new BacktraceReportSubmission(
                {
                    url: TEST_SUBMISSION_URL,
                },
                testHttpClient,
            ),
        );

        const result = database.add({} as BacktraceData, []);
        expect(result).toBeFalsy();
    });
});
