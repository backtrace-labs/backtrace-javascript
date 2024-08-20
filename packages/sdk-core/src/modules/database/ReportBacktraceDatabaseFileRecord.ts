import { BacktraceAttachment } from '../../model/attachment';
import { BacktraceData } from '../../model/data';
import { isFileAttachment } from '../attachments/isFileAttachment';
import { FileSystem } from '../storage';
import { BacktraceDatabaseFileRecord } from './BacktraceDatabaseFileRecord';
import { ReportBacktraceDatabaseRecord } from './model/BacktraceDatabaseRecord';

export class ReportBacktraceDatabaseFileRecord implements ReportBacktraceDatabaseRecord {
    public readonly type = 'report';
    public readonly data: BacktraceData;
    public readonly id: string;
    public readonly hash: string;
    public readonly timestamp: number;
    public readonly sessionId?: string;
    public locked: boolean;

    private constructor(
        record: ReportBacktraceDatabaseRecord,
        public readonly attachments: BacktraceAttachment[],
    ) {
        this.data = record.data;
        this.id = record.id;
        this.hash = record.hash;
        this.timestamp = record.timestamp;
        this.sessionId = record.sessionId;
        // make sure the database record stored in the database directory
        // is never locked. By doing this, we want to be sure once we load
        // the record once again, the record will be available for future usage
        this.locked = false;
    }

    public static fromRecord(record: ReportBacktraceDatabaseRecord) {
        return new ReportBacktraceDatabaseFileRecord(record, record.attachments.filter(isFileAttachment));
    }

    public static fromJson(
        json: string | ReportBacktraceDatabaseRecord,
        fileSystem: FileSystem,
    ): BacktraceDatabaseFileRecord | undefined {
        try {
            const record = typeof json === 'string' ? (JSON.parse(json) as ReportBacktraceDatabaseRecord) : json;
            const attachments = record.attachments
                ? record.attachments
                      .filter(isFileAttachment)
                      .map((n) => fileSystem.createAttachment(n.filePath, n.name))
                : [];
            return new ReportBacktraceDatabaseFileRecord(record, attachments);
        } catch {
            return undefined;
        }
    }
}
