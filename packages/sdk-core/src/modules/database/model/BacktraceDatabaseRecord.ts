import { BacktraceAttachment } from '../../../model/attachment';
import { BacktraceData } from '../../../model/data/BacktraceData';

export interface BacktraceDatabaseRecord {
    data: BacktraceData;
    id: string;
    attachments: BacktraceAttachment[];
    count: number;
    hash: string;
    /**
     * Determines if the record is in use
     */
    locked: boolean;
}
