import { jsonEscaper } from '../../common/jsonEscaper';
import { BacktraceAttachment } from '../attachment';
import { BacktraceConfiguration } from '../configuration/BacktraceConfiguration';
import { BacktraceData } from '../data/BacktraceData';
import { BacktraceReportSubmissionResult } from '../data/BacktraceSubmissionResult';
import { BacktraceRequestHandler } from './BacktraceRequestHandler';
import { BacktraceAttachmentResponse } from './model/BacktraceAttachmentResponse';
import { BacktraceSubmissionResponse } from './model/BacktraceSubmissionResponse';
import { SubmissionUrlInformation } from './SubmissionUrlInformation';

export interface BacktraceReportSubmission {
    send(
        data: BacktraceData,
        attachments: BacktraceAttachment[],
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<BacktraceSubmissionResponse>>;

    sendAttachment(
        rxid: string,
        attachment: BacktraceAttachment,
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<BacktraceAttachmentResponse>>;
}

export class RequestBacktraceReportSubmission implements BacktraceReportSubmission {
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

    public async sendAttachment(
        rxid: string,
        attachment: BacktraceAttachment,
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<BacktraceAttachmentResponse>> {
        if (!this._requestHandler.postAttachment) {
            return BacktraceReportSubmissionResult.Unsupported<BacktraceAttachmentResponse>(
                'postAttachment is not implemented',
            );
        }

        return await this._requestHandler.postAttachment(
            SubmissionUrlInformation.toAttachmentSubmissionUrl(this._submissionUrl, rxid, attachment.name),
            attachment,
            abortSignal,
        );
    }
}
