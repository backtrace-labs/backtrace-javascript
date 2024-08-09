import { BacktraceAttachment, BacktraceFileAttachment } from '../../model/attachment';
import { BacktraceData } from '../../model/data';
import { FileSystem } from '../storage';
import {
    AttachmentBacktraceDatabaseRecord,
    BacktraceDatabaseRecord,
    ReportBacktraceDatabaseRecord,
} from './model/BacktraceDatabaseRecord';

export const BacktraceDatabaseFileRecord = {
    fromRecord(record: BacktraceDatabaseRecord) {
        switch (record.type) {
            case 'attachment':
                return AttachmentBacktraceDatabaseFileRecord.fromRecord(record);
            case 'report':
                return ReportBacktraceDatabaseFileRecord.fromRecord(record);
            default:
                throw new Error('unknown record type');
        }
    },

    fromJson(json: string, fileSystem: FileSystem): BacktraceDatabaseFileRecord | undefined {
        try {
            const record = JSON.parse(json) as BacktraceDatabaseRecord;
            switch (record.type) {
                case 'attachment':
                    return AttachmentBacktraceDatabaseFileRecord.fromJson(record, fileSystem);
                case 'report':
                    return ReportBacktraceDatabaseFileRecord.fromJson(record, fileSystem);
                default:
                    return undefined;
            }
        } catch {
            return undefined;
        }
    },
};

export type BacktraceDatabaseFileRecord = ReportBacktraceDatabaseFileRecord | AttachmentBacktraceDatabaseFileRecord;

export class ReportBacktraceDatabaseFileRecord implements ReportBacktraceDatabaseRecord {
    public readonly type = 'report';
    public readonly data: BacktraceData;
    public readonly id: string;
    public readonly count: number;
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
        this.count = record.count;
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

export class AttachmentBacktraceDatabaseFileRecord implements AttachmentBacktraceDatabaseRecord {
    public readonly type = 'attachment';
    public readonly id: string;
    public readonly rxid: string;
    public readonly hash: string;
    public readonly timestamp: number;
    public readonly attachment: BacktraceAttachment<unknown>;
    public readonly sessionId?: string | undefined;
    public readonly count: number;
    public locked: boolean;

    private constructor(record: AttachmentBacktraceDatabaseRecord) {
        this.attachment = record.attachment;
        this.id = record.id;
        this.count = record.count;
        this.hash = record.hash;
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

function isFileAttachment(attachment: BacktraceAttachment): attachment is BacktraceFileAttachment {
    return 'filePath' in attachment && typeof attachment.filePath === 'string';
}
