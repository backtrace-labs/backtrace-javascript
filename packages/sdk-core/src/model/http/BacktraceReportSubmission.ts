import { jsonEscaper } from '../../common/jsonEscaper.js';
import { BacktraceAttachment } from '../attachment/index.js';
import { BacktraceReportSubmissionResult } from '../data/BacktraceSubmissionResult.js';
import { BacktraceRequestHandler } from './BacktraceRequestHandler.js';
import { BacktraceAttachmentResponse } from './model/attachment/response/BacktraceAttachmentResponse.js';
import { BacktraceSubmissionResponse } from './model/submit/index.js';
import { BacktraceSubmitBody } from './model/submit/request/BacktraceSubmitBody.js';
import { SubmissionUrlInformation } from './SubmissionUrlInformation.js';

export interface BacktraceReportSubmission {
    send(
        data: BacktraceSubmitBody,
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
        options: { url: string; token?: string },
        private readonly _requestHandler: BacktraceRequestHandler,
    ) {
        this._submissionUrl = SubmissionUrlInformation.toJsonReportSubmissionUrl(options.url, options.token);
    }

    public send(
        data: BacktraceSubmitBody,
        attachments: BacktraceAttachment[],
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<BacktraceSubmissionResponse>> {
        try {
            const json = JSON.stringify(data, jsonEscaper());
            return this._requestHandler.postError(this._submissionUrl, json, attachments, abortSignal);
        } catch (error) {
            // catch error generated during toJSON execution or unsupported objects to not cause the app crash.
            return Promise.resolve(
                BacktraceReportSubmissionResult.OnUnknownError(error instanceof Error ? error.message : String(error)),
            );
        }
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
