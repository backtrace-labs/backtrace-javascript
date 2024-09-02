import { BacktraceAttachment } from '../model/attachment/index.js';
import { BacktraceData } from '../model/data/index.js';
import { BacktraceReportSubmissionResult, BacktraceSubmissionResponse } from '../model/http/index.js';
import { BacktraceReport } from '../model/report/BacktraceReport.js';

export type ReportEvents = {
    'before-skip'(report: BacktraceReport): void;
    'before-send'(report: BacktraceReport, data: BacktraceData, attachments: BacktraceAttachment[]): void;
    'after-send'(
        report: BacktraceReport,
        data: BacktraceData,
        attachments: BacktraceAttachment[],
        result: BacktraceReportSubmissionResult<BacktraceSubmissionResponse>,
    ): void;
};
