import { jsonEscaper } from '../../../common/jsonEscaper.js';
import { BacktraceAttachment } from '../../../model/attachment/BacktraceAttachment.js';
import { BacktraceData } from '../../../model/data/BacktraceData.js';
import { BacktraceReportSubmission } from '../../../model/http/BacktraceReportSubmission.js';
import { BacktraceReportSubmissionResult, BacktraceSubmitResponse } from '../../../model/http/index.js';
import { SessionId } from '../../storage/SessionFiles.js';
import { BacktraceDatabaseRecordSender } from '../BacktraceDatabaseRecordSender.js';
import { BacktraceDatabaseRecordSerializer } from '../BacktraceDatabaseRecordSerializer.js';
import { ReportBacktraceDatabaseRecordFactory } from '../ReportBacktraceDatabaseRecordFactory.js';
import { BacktraceDatabaseRecord, BacktraceDatabaseRecordFactory } from './BacktraceDatabaseRecord.js';

export interface ReportBacktraceDatabaseRecord extends BacktraceDatabaseRecord<'report'> {
    readonly data: BacktraceData;
}

export class ReportBacktraceDatabaseRecordSerializer
    implements BacktraceDatabaseRecordSerializer<ReportBacktraceDatabaseRecord>
{
    public readonly type = 'report';

    public save(record: BacktraceDatabaseRecord): string {
        return JSON.stringify(record, jsonEscaper());
    }

    public load(json: string): ReportBacktraceDatabaseRecord | undefined {
        try {
            const record = JSON.parse(json) as BacktraceDatabaseRecord;
            if (record.type !== this.type) {
                return undefined;
            }
            return record as ReportBacktraceDatabaseRecord;
        } catch {
            return undefined;
        }
    }
}

export class ReportBacktraceDatabaseRecordSender
    implements BacktraceDatabaseRecordSender<ReportBacktraceDatabaseRecord>
{
    public readonly type = 'report';

    constructor(private readonly _reportSubmission: BacktraceReportSubmission) {}

    public send(
        record: ReportBacktraceDatabaseRecord,
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<BacktraceSubmitResponse>> {
        return this._reportSubmission.send(record.data, [], abortSignal);
    }
}

export class DefaultReportBacktraceDatabaseRecordFactory implements ReportBacktraceDatabaseRecordFactory {
    constructor(private readonly _recordFactory: BacktraceDatabaseRecordFactory) {}

    public static default() {
        return new DefaultReportBacktraceDatabaseRecordFactory(new BacktraceDatabaseRecordFactory());
    }

    public create(
        data: BacktraceData,
        _attachments: BacktraceAttachment[],
        sessionId?: SessionId,
    ): ReportBacktraceDatabaseRecord {
        const record: ReportBacktraceDatabaseRecord = {
            ...this._recordFactory.create('report'),
            sessionId,
            data,
            locked: false,
        };

        return record;
    }
}
