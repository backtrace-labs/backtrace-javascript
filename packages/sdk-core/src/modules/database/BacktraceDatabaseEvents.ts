import { BacktraceReportSubmissionResult } from '../../model/data/BacktraceSubmissionResult.js';
import { BacktraceSubmissionResponse } from '../../model/http/index.js';
import { BacktraceDatabaseRecord } from './model/BacktraceDatabaseRecord.js';

export type BacktraceDatabaseEvents = {
    added: [record: BacktraceDatabaseRecord];
    removed: [record: BacktraceDatabaseRecord];
    'before-send': [record: BacktraceDatabaseRecord];
    'after-send': [
        record: BacktraceDatabaseRecord,
        result: BacktraceReportSubmissionResult<BacktraceSubmissionResponse>,
    ];
};
