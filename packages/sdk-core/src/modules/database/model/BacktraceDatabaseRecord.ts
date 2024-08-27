import { BacktraceAttachment } from '../../../model/attachment';
import { BacktraceData } from '../../../model/data/BacktraceData';

export interface ReportBacktraceDatabaseRecord {
    readonly type: 'report';
    readonly data: BacktraceData;
    readonly id: string;
    readonly hash: string;
    readonly timestamp: number;
    readonly sessionId?: string;
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
    readonly hash: string;
    readonly timestamp: number;
    readonly attachment: BacktraceAttachment;
    readonly sessionId: string;
    /**
     * Determines if the record is in use
     */
    locked: boolean;
}

export type BacktraceDatabaseRecord = ReportBacktraceDatabaseRecord | AttachmentBacktraceDatabaseRecord;

export type BacktraceDatabaseRecordCountByType = Record<BacktraceDatabaseRecord['type'], number>;
