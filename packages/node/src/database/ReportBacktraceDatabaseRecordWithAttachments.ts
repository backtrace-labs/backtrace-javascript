import {
    BacktraceAttachment,
    BacktraceData,
    BacktraceDatabaseRecord,
    BacktraceReportSubmission,
    BacktraceReportSubmissionResult,
    BacktraceSubmitResponse,
    BacktraceSyncStorage,
    DefaultReportBacktraceDatabaseRecordFactory,
    jsonEscaper,
    ReportBacktraceDatabaseRecord,
    ReportBacktraceDatabaseRecordFactory,
} from '@backtrace/sdk-core';
import { BacktraceDatabaseRecordSender } from '@backtrace/sdk-core/lib/modules/database/BacktraceDatabaseRecordSender.js';
import { BacktraceDatabaseRecordSerializer } from '@backtrace/sdk-core/lib/modules/database/BacktraceDatabaseRecordSerializer.js';
import { BacktraceFileAttachment } from '../attachment/BacktraceFileAttachment.js';
import { isFileAttachment } from '../attachment/isFileAttachment.js';
import { BacktraceStreamStorage } from '../storage/BacktraceStorage.js';

export interface ReportBacktraceDatabaseRecordWithAttachments extends ReportBacktraceDatabaseRecord {
    readonly attachments: BacktraceAttachment[];
}

export class ReportBacktraceDatabaseRecordWithAttachmentsSerializer
    implements BacktraceDatabaseRecordSerializer<ReportBacktraceDatabaseRecordWithAttachments>
{
    public readonly type = 'report';

    constructor(private readonly _storage: BacktraceSyncStorage & BacktraceStreamStorage) {}

    public save(record: ReportBacktraceDatabaseRecordWithAttachments): string {
        return JSON.stringify(
            {
                ...record,
                attachments: record.attachments.filter(isFileAttachment),
            } satisfies ReportBacktraceDatabaseRecordWithAttachments,
            jsonEscaper(),
        );
    }

    public load(json: string): ReportBacktraceDatabaseRecordWithAttachments | undefined {
        try {
            const record = JSON.parse(json) as BacktraceDatabaseRecord;
            if (record.type !== this.type) {
                return undefined;
            }

            const reportRecord = record as ReportBacktraceDatabaseRecordWithAttachments;
            if (reportRecord.attachments) {
                return {
                    ...reportRecord,
                    attachments: reportRecord.attachments
                        .filter(isFileAttachment)
                        .map((a) => new BacktraceFileAttachment(a.filePath, a.name, this._storage)),
                };
            }

            return {
                ...reportRecord,
                attachments: [],
            };
        } catch {
            return undefined;
        }
    }
}

export class ReportBacktraceDatabaseRecordWithAttachmentsSender
    implements BacktraceDatabaseRecordSender<ReportBacktraceDatabaseRecordWithAttachments>
{
    public readonly type = 'report';

    constructor(private readonly _reportSubmission: BacktraceReportSubmission) {}

    public send(
        record: ReportBacktraceDatabaseRecordWithAttachments,
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<BacktraceSubmitResponse>> {
        return this._reportSubmission.send(record.data, record.attachments, abortSignal);
    }
}

export class ReportBacktraceDatabaseRecordWithAttachmentsFactory implements ReportBacktraceDatabaseRecordFactory {
    constructor(private readonly _defaultFactory: ReportBacktraceDatabaseRecordFactory) {}

    public static default() {
        return new ReportBacktraceDatabaseRecordWithAttachmentsFactory(
            DefaultReportBacktraceDatabaseRecordFactory.default(),
        );
    }

    public create(
        data: BacktraceData,
        attachments: BacktraceAttachment[],
    ): ReportBacktraceDatabaseRecordWithAttachments {
        const record = this._defaultFactory.create(data, attachments);

        return {
            ...record,
            attachments: attachments.filter((a) => a instanceof BacktraceFileAttachment),
        };
    }
}
