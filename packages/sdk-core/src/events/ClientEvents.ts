import { BacktraceAttachment } from '../model/attachment/index.js';
import { BacktraceData } from '../model/data/index.js';
import { BacktraceReportSubmissionResult, BacktraceSubmissionResponse } from '../model/http/index.js';
import { BacktraceReport } from '../model/report/BacktraceReport.js';

export type ClientEvents = {
    'before-skip': [report: BacktraceReport];
    'before-send': [report: BacktraceReport, data: BacktraceData, attachments: BacktraceAttachment[]];
    'after-send': [
        report: BacktraceReport,
        data: BacktraceData,
        attachments: BacktraceAttachment[],
        result: BacktraceReportSubmissionResult<BacktraceSubmissionResponse>,
    ];
};
