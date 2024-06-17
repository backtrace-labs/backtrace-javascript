import { jsonEscaper } from '../../common/jsonEscaper';
import { BacktraceAttachment } from '../attachment';
import { BacktraceConfiguration } from '../configuration/BacktraceConfiguration';
import { BacktraceData } from '../data/BacktraceData';
import { BacktraceReportSubmissionResult } from '../data/BacktraceSubmissionResult';
import { BacktraceRequestHandler } from './BacktraceRequestHandler';
import { BacktraceSubmissionResponse } from './model/BacktraceSubmissionResponse';
import { SubmissionUrlInformation } from './SubmissionUrlInformation';

export interface BacktraceReportSubmission {
    send(
        data: BacktraceData,
        attachments: BacktraceAttachment[],
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<BacktraceSubmissionResponse>>;
}

export class RequestBacktraceReportSubmission {
    private readonly _submissionUrl: string;
    constructor(
        options: BacktraceConfiguration,
        private readonly _requestHandler: BacktraceRequestHandler,
    ) {
        this._submissionUrl = SubmissionUrlInformation.toJsonReportSubmissionUrl(options.url, options.token);
    }

    public send(data: BacktraceData, attachments: BacktraceAttachment[], abortSignal?: AbortSignal) {
        const json = JSON.stringify(data, jsonEscaper());
        return this._requestHandler.postError(this._submissionUrl, json, attachments, abortSignal);
    }
}
