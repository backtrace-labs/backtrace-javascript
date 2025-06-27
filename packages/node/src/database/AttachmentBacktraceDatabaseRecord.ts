import {
    BacktraceAttachment,
    BacktraceDatabaseRecord,
    BacktraceDatabaseRecordFactory,
    BacktraceReportSubmission,
    BacktraceReportSubmissionResult,
    BacktraceSubmitResponse,
    jsonEscaper,
    SessionId,
} from '@backtrace/sdk-core';
import { BacktraceDatabaseRecordSender } from '@backtrace/sdk-core/lib/modules/database/BacktraceDatabaseRecordSender.js';
import { BacktraceDatabaseRecordSerializer } from '@backtrace/sdk-core/lib/modules/database/BacktraceDatabaseRecordSerializer.js';
import { BacktraceFileAttachmentFactory } from '../attachment/BacktraceFileAttachment.js';
import { isFileAttachment } from '../attachment/isFileAttachment.js';

export interface AttachmentBacktraceDatabaseRecord extends BacktraceDatabaseRecord<'attachment'> {
    readonly rxid: string;
    readonly attachment: BacktraceAttachment;
    readonly sessionId: SessionId;
}

export class AttachmentBacktraceDatabaseRecordSerializer
    implements BacktraceDatabaseRecordSerializer<AttachmentBacktraceDatabaseRecord>
{
    public readonly type = 'attachment';

    constructor(private readonly _fileAttachmentFactory: BacktraceFileAttachmentFactory) {}

    public save(record: AttachmentBacktraceDatabaseRecord): string | undefined {
        if (!isFileAttachment(record.attachment)) {
            return undefined;
        }

        return JSON.stringify(record, jsonEscaper());
    }

    public load(json: string): AttachmentBacktraceDatabaseRecord | undefined {
        try {
            const record = JSON.parse(json) as BacktraceDatabaseRecord;
            if (record.type !== this.type) {
                return undefined;
            }

            const attachmentRecord = record as AttachmentBacktraceDatabaseRecord;
            if (!isFileAttachment(attachmentRecord.attachment)) {
                return undefined;
            }

            const attachment = this._fileAttachmentFactory.create(
                attachmentRecord.attachment.filePath,
                attachmentRecord.attachment.name,
            );

            return {
                ...attachmentRecord,
                attachment,
            };
        } catch {
            return undefined;
        }
    }
}

export class AttachmentBacktraceDatabaseRecordSender
    implements BacktraceDatabaseRecordSender<AttachmentBacktraceDatabaseRecord>
{
    public readonly type = 'attachment';

    constructor(private readonly _reportSubmission: BacktraceReportSubmission) {}

    public send(
        record: AttachmentBacktraceDatabaseRecord,
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<BacktraceSubmitResponse>> {
        return this._reportSubmission.sendAttachment(record.rxid, record.attachment, abortSignal);
    }
}

export class AttachmentBacktraceDatabaseRecordFactory {
    constructor(private readonly _reportFactory: BacktraceDatabaseRecordFactory) {}

    public static default() {
        return new AttachmentBacktraceDatabaseRecordFactory(new BacktraceDatabaseRecordFactory());
    }

    public create(
        rxid: string,
        sessionId: SessionId,
        attachment: BacktraceAttachment,
    ): AttachmentBacktraceDatabaseRecord {
        const record: AttachmentBacktraceDatabaseRecord = {
            ...this._reportFactory.create('attachment'),
            sessionId,
            rxid,
            attachment,
        };

        return record;
    }
}
