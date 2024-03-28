import { BacktraceAttachment } from '../model/attachment';
import { BacktraceData } from '../model/data';
import { BacktraceReportSubmissionResult, BacktraceSubmissionResponse } from '../model/http';
import { BacktraceReport } from '../model/report/BacktraceReport';

export type ReportEvents = {
    'before-skip'(report: BacktraceReport): void;
    'before-send'(report: BacktraceReport, data: BacktraceData, attachments: BacktraceAttachment[]): void;
    'after-data'(report: BacktraceReport, data: BacktraceData): void;
    'after-send'(
        report: BacktraceReport,
        data: BacktraceData,
        attachments: BacktraceAttachment[],
        result: BacktraceReportSubmissionResult<BacktraceSubmissionResponse>,
    ): void;
};
