import { BacktraceAttachment } from '../../../model/attachment/index.js';
import { BacktraceData } from '../../../model/data/BacktraceData.js';
import { SessionId } from '../../storage/SessionFiles.js';

export interface ReportBacktraceDatabaseRecord {
    readonly type: 'report';
    readonly data: BacktraceData;
    readonly id: string;
    readonly timestamp: number;
    readonly sessionId?: SessionId;
    attachments: BacktraceAttachment[];
    /**
     * Determines if the record is in use
     */
    locked: boolean;
}

export interface AttachmentBacktraceDatabaseRecord {
    readonly type: 'attachment';
    readonly id: string;
    readonly rxid: string;
    readonly timestamp: number;
    readonly attachment: BacktraceAttachment;
    readonly sessionId: SessionId;
    /**
     * Determines if the record is in use
     */
    locked: boolean;
}

export type BacktraceDatabaseRecord = ReportBacktraceDatabaseRecord | AttachmentBacktraceDatabaseRecord;

export type BacktraceDatabaseRecordCountByType = Record<BacktraceDatabaseRecord['type'], number>;
