import { BacktraceAttachment } from '../../../model/attachment';
import { BacktraceData } from '../../../model/data/BacktraceData';

export interface BacktraceDatabaseRecord {
    readonly data: BacktraceData;
    readonly id: string;
    readonly hash: string;
    attachments: BacktraceAttachment[];
    count: number;
    /**
     * Determines if the record is in use
     */
    locked: boolean;
}
