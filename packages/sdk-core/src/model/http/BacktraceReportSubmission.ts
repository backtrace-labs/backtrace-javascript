import { jsonEscaper } from '../../common/jsonEscaper';
import { BacktraceAttachment } from '../attachment';
import { BacktraceConfiguration } from '../configuration/BacktraceConfiguration';
import { BacktraceData } from '../data/BacktraceData';
import { BacktraceRequestHandler } from './BacktraceRequestHandler';
import { SubmissionUrlInformation } from './SubmissionUrlInformation';

export class BacktraceReportSubmission {
    private readonly _submissionUrl: string;
    constructor(options: BacktraceConfiguration, private readonly _requestHandler: BacktraceRequestHandler) {
        this._submissionUrl = SubmissionUrlInformation.toJsonReportSubmissionUrl(options.url, options.token);
    }

    public send(data: BacktraceData, attachments: BacktraceAttachment[]) {
        return this._requestHandler.postError(this._submissionUrl, JSON.stringify(data, jsonEscaper()), attachments);
    }
}
