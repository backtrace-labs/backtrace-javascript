import { BacktraceReport, DebugIdProvider, DeduplicationStrategy } from '../../src';
import { BacktraceReportSubmission } from '../../src/model/http/BacktraceReportSubmission';
import { V8StackTraceConverter } from '../../src/modules/converter/V8StackTraceConverter';
import { BacktraceDataBuilder } from '../../src/modules/data/BacktraceDataBuilder';
import { BacktraceDatabase } from '../../src/modules/database/BacktraceDatabase';
import { TEST_SUBMISSION_URL } from '../mocks/BacktraceTestClient';
import { testHttpClient } from '../mocks/testHttpClient';
import { testDatabaseSetup } from '../mocks/testStorageProvider';

describe('Deduplication tests', () => {
    const sdkOptions = {
        agent: 'test',
        agentVersion: '0.0.1',
        langName: 'test',
        langVersion: 'test',
    };
    const dataBuilder = new BacktraceDataBuilder(
        sdkOptions,
        new V8StackTraceConverter(),
        new DebugIdProvider(new V8StackTraceConverter()),
    );

    it('Should merge two the same reports', () => {
        const backtraceDatabase = new BacktraceDatabase(
            {
                deduplicationStrategy: DeduplicationStrategy.All,
                autoSend: false,
            },
            testDatabaseSetup,
            new BacktraceReportSubmission(
                {
                    url: TEST_SUBMISSION_URL,
                },
                testHttpClient,
            ),
        );
        backtraceDatabase.start();

        const data = dataBuilder.build(new BacktraceReport('test'));
        const record = backtraceDatabase.add(data, []);
        const record2 = backtraceDatabase.add(data, []);

        if (!record || !record2) {
            throw new Error('Records should be defined!');
        }

        expect(record.id).toEqual(record2.id);
        expect(record2.count).toBe(2);
    });

    it('Should not merge two reports with different error message', () => {
        const backtraceDatabase = new BacktraceDatabase(
            {
                deduplicationStrategy: DeduplicationStrategy.All,
                autoSend: false,
            },
            testDatabaseSetup,
            new BacktraceReportSubmission(
                {
                    url: TEST_SUBMISSION_URL,
                },
                testHttpClient,
            ),
        );
        backtraceDatabase.start();
        const error = new Error('error');
        const error2 = new Error('error2');
        error2.stack = error.stack;

        const record = backtraceDatabase.add(dataBuilder.build(new BacktraceReport(error)), []);
        const record2 = backtraceDatabase.add(dataBuilder.build(new BacktraceReport(error2)), []);

        if (!record || !record2) {
            throw new Error('Records should be defined!');
        }

        expect(record.id).not.toEqual(record2.id);
        expect(record.count).toBe(1);
        expect(record2.count).toBe(1);
    });

    it('Should merge two reports with different stack trace if deduplication strategy is set to classifier and message', () => {
        const backtraceDatabase = new BacktraceDatabase(
            {
                deduplicationStrategy: DeduplicationStrategy.Classifier | DeduplicationStrategy.Message,
                autoSend: false,
            },
            testDatabaseSetup,
            new BacktraceReportSubmission(
                {
                    url: TEST_SUBMISSION_URL,
                },
                testHttpClient,
            ),
        );
        backtraceDatabase.start();

        const error = new Error('record');
        const error2 = new Error('record');
        const record = backtraceDatabase.add(dataBuilder.build(new BacktraceReport(error)), []);
        const record2 = backtraceDatabase.add(dataBuilder.build(new BacktraceReport(error2)), []);

        if (!record || !record2) {
            throw new Error('Records should be defined!');
        }

        expect(error.stack).not.toEqual(error2.stack);
        expect(record.id).toEqual(record2.id);
        expect(record2.count).toBe(2);
    });
});
