import { BacktraceAttachment } from '../../model/attachment/index.js';
import { isFileAttachment } from '../attachments/isFileAttachment.js';
import { FileSystem, SessionId } from '../storage/index.js';
import { BacktraceDatabaseFileRecord } from './BacktraceDatabaseFileRecord.js';
import { AttachmentBacktraceDatabaseRecord } from './model/BacktraceDatabaseRecord.js';

export class AttachmentBacktraceDatabaseFileRecord implements AttachmentBacktraceDatabaseRecord {
    public readonly type = 'attachment';
    public readonly id: string;
    public readonly rxid: string;
    public readonly timestamp: number;
    public readonly attachment: BacktraceAttachment<unknown>;
    public readonly sessionId: SessionId | string;
    public locked: boolean;

    private constructor(record: AttachmentBacktraceDatabaseRecord) {
        this.attachment = record.attachment;
        this.id = record.id;
        this.timestamp = record.timestamp;
        this.rxid = record.rxid;
        this.sessionId = record.sessionId;
        // make sure the database record stored in the database directory
        // is never locked. By doing this, we want to be sure once we load
        // the record once again, the record will be available for future usage
        this.locked = false;
    }

    public static fromRecord(record: AttachmentBacktraceDatabaseRecord) {
        return new AttachmentBacktraceDatabaseFileRecord(record);
    }

    public static fromJson(
        json: string | AttachmentBacktraceDatabaseRecord,
        fileSystem: FileSystem,
    ): BacktraceDatabaseFileRecord | undefined {
        try {
            const record = typeof json === 'string' ? (JSON.parse(json) as AttachmentBacktraceDatabaseRecord) : json;
            if (!isFileAttachment(record.attachment)) {
                return undefined;
            }

            if (!fileSystem.existsSync(record.attachment.filePath)) {
                return undefined;
            }

            const attachment = fileSystem.createAttachment(record.attachment.filePath, record.attachment.name);
            return new AttachmentBacktraceDatabaseFileRecord({
                ...record,
                attachment,
            });
        } catch {
            return undefined;
        }
    }
}
