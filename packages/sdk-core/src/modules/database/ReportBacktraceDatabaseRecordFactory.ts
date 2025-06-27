import { BacktraceAttachment } from '../../model/attachment/BacktraceAttachment.js';
import { BacktraceData } from '../../model/data/BacktraceData.js';
import { SessionId } from '../storage/SessionFiles.js';
import { ReportBacktraceDatabaseRecord } from './model/ReportBacktraceDatabaseRecord.js';

export interface ReportBacktraceDatabaseRecordFactory {
    create(
        data: BacktraceData,
        attachments: BacktraceAttachment[],
        sessionId?: SessionId,
    ): ReportBacktraceDatabaseRecord;
}
