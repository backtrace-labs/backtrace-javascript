import assert from 'assert';
import {
    BacktraceDatabaseConfiguration,
    BacktraceReportSubmissionResult,
    ReportBacktraceDatabaseRecord,
} from '../../src/index.js';
import { BacktraceDatabase } from '../../src/modules/database/BacktraceDatabase.js';
import { mockBacktraceStorage } from '../_mocks/storage.js';
import { BacktraceTestClient } from '../mocks/BacktraceTestClient.js';

describe('Database context validation tests', () => {
    describe('Record overflow tests', () => {
        const testDatabaseSettings: BacktraceDatabaseConfiguration = {
            enable: true,
            autoSend: false,
        };

        afterEach(() => {
            jest.clearAllMocks();
        });

        const testingOverflows = [
            [3, 4],
            [1, 10],
            [3, 1],
        ];
        for (const testingOverflow of testingOverflows) {
            it(`Should drop the latest record after reaching overflow. Max: ${testingOverflow[0]}. Overflow: ${testingOverflow[1]}`, async () => {
                const maximumNumberOfRecords = testingOverflow[0];
                const overflowEvents = testingOverflow[1];
                const client = BacktraceTestClient.buildFakeClient(
                    {
                        database: {
                            ...testDatabaseSettings,
                            maximumNumberOfRecords,
                        },
                    },
                    [],
                    [],
                    mockBacktraceStorage(),
                );
                jest.spyOn(client.requestHandler, 'postError').mockResolvedValue(
                    Promise.resolve(BacktraceReportSubmissionResult.OnInternalServerError('test')),
                );
                const database = client.database as BacktraceDatabase;
                if (!database) {
                    throw new Error('Invalid database setup. Database must be defined!');
                }

                for (let index = 0; index != maximumNumberOfRecords + overflowEvents; index++) {
                    await client.send(index.toString());
                }

                const records = database.get();
                for (let index = 0; index < maximumNumberOfRecords; index++) {
                    const record = records[index];
                    const expectedMessage = overflowEvents + index;
                    assert(record.type === 'report');
                    expect((record as ReportBacktraceDatabaseRecord).data.attributes['error.message']).toEqual(
                        expectedMessage.toString(),
                    );
                }
            });
        }
    });
});
