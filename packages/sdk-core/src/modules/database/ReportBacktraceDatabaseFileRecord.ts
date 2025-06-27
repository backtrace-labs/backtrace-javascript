import { BacktraceAttachment } from '../../model/attachment/index.js';
import { BacktraceData } from '../../model/data/index.js';
import { isFileAttachment } from '../attachments/isFileAttachment.js';
import { FileSystem, SessionId } from '../storage/index.js';
import { BacktraceDatabaseFileRecord } from './BacktraceDatabaseFileRecord.js';
import { ReportBacktraceDatabaseRecord } from './model/BacktraceDatabaseRecord.js';

export class ReportBacktraceDatabaseFileRecord implements ReportBacktraceDatabaseRecord {
    public readonly type = 'report';
    public readonly data: BacktraceData;
    public readonly id: string;
    public readonly timestamp: number;
    public readonly sessionId?: SessionId;
    public locked: boolean;

    private constructor(
        record: ReportBacktraceDatabaseRecord,
        public readonly attachments: BacktraceAttachment[],
    ) {
        this.data = record.data;
        this.id = record.id;
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
