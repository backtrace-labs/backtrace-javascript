import { BacktraceData, BacktraceDatabaseRecord } from '@backtrace/sdk-core';
import { BacktraceFileAttachment } from '../attachment';

export class BacktraceDatabaseFileRecord implements BacktraceDatabaseRecord {
    public readonly data: BacktraceData;
    public readonly id: string;
    public readonly count: number;
    public readonly hash: string;
    public readonly timestamp: number;
    public locked: boolean;

    private constructor(record: BacktraceDatabaseRecord, public readonly attachments: BacktraceFileAttachment[]) {
        this.data = record.data;
        this.id = record.id;
        this.count = record.count;
        this.hash = record.hash;
        this.timestamp = record.timestamp;
        // make sure the database record stored in the database directory
        // is never locked. By doing this, we want to be sure once we load
        // the record once again, the record will be available for future usage
        this.locked = false;
    }

    public static fromRecord(record: BacktraceDatabaseRecord) {
        return new BacktraceDatabaseFileRecord(
            record,
            record.attachments.filter((n) => n instanceof BacktraceFileAttachment) as BacktraceFileAttachment[],
        );
    }

    public static fromJson(json: string): BacktraceDatabaseFileRecord | undefined {
        try {
            const record = JSON.parse(json) as BacktraceDatabaseFileRecord;
            const attachments = record.attachments
                ? record.attachments.map((n) => new BacktraceFileAttachment(n.filePath))
                : [];
            return new BacktraceDatabaseFileRecord(record, attachments);
        } catch {
            return undefined;
        }
    }
}
