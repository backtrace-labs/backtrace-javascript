import { BacktraceAttachment, BacktraceFileAttachment } from '../../model/attachment';
import { BacktraceData } from '../../model/data';
import { FileSystem } from '../storage';
import { BacktraceDatabaseRecord } from './model/BacktraceDatabaseRecord';

export class BacktraceDatabaseFileRecord implements BacktraceDatabaseRecord {
    public readonly data: BacktraceData;
    public readonly id: string;
    public readonly count: number;
    public readonly hash: string;
    public readonly timestamp: number;
    public locked: boolean;

    private constructor(
        record: BacktraceDatabaseRecord,
        public readonly attachments: BacktraceAttachment[],
    ) {
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
            record.attachments.filter(BacktraceDatabaseFileRecord.isFileAttachment),
        );
    }

    public static fromJson(json: string, fileSystem: FileSystem): BacktraceDatabaseFileRecord | undefined {
        try {
            const record = JSON.parse(json) as BacktraceDatabaseFileRecord;
            const attachments = record.attachments
                ? record.attachments
                      .filter(BacktraceDatabaseFileRecord.isFileAttachment)
                      .map((n) => fileSystem.createAttachment(n.filePath, n.name))
                : [];
            return new BacktraceDatabaseFileRecord(record, attachments);
        } catch {
            return undefined;
        }
    }

    private static isFileAttachment(attachment: BacktraceAttachment): attachment is BacktraceFileAttachment {
        return 'filePath' in attachment && typeof attachment.filePath === 'string';
    }
}
