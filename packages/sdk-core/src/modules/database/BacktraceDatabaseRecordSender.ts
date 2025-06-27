import { BacktraceReportSubmissionResult } from '../../model/data/BacktraceSubmissionResult.js';
import { BacktraceSubmitResponse } from '../../model/http/index.js';
import { BacktraceDatabaseRecord } from './model/BacktraceDatabaseRecord.js';

export interface BacktraceDatabaseRecordSender<Record extends BacktraceDatabaseRecord = BacktraceDatabaseRecord> {
    readonly type: Record['type'];

    send(record: Record, abortSignal?: AbortSignal): Promise<BacktraceReportSubmissionResult<BacktraceSubmitResponse>>;
}

export type BacktraceDatabaseRecordSenders<Record extends BacktraceDatabaseRecord = BacktraceDatabaseRecord> = {
    [R in Record as Record['type']]: BacktraceDatabaseRecordSender<R>;
};
