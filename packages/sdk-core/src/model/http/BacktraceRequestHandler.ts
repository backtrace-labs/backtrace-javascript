import { BacktraceAttachment } from '../attachment/index.js';
import { BacktraceReportSubmissionResult } from '../data/BacktraceSubmissionResult.js';
import { BacktraceAttachmentResponse } from './model/attachment/response/BacktraceAttachmentResponse.js';
import { BacktraceSubmitResponse } from './model/submit/index.js';
export const DEFAULT_TIMEOUT = 15_000;
export interface BacktraceRequestHandler {
    /**
     * Submits error to Backtrace submission API
     * @param submissionUrl error submission URL
     * @param dataJson Backtrace data JSON
     * @param attachments Report attachments
     * @param abortSignal Signal to abort sending
     * @returns Submission result
     */
    postError(
        submissionUrl: string,
        dataJson: string,
        attachments: BacktraceAttachment[],
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<BacktraceSubmitResponse>>;

    /**
     * Post data to Backtrace API
     * @param submissionUrl data submission URL
     * @param payload request payload
     * @param abortSignal Signal to abort sending
     */
    post<T>(
        submissionUrl: string,
        payload: string,
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<T>>;

    /**
     * Post attachment to Backtrace API for an existing error
     * @param submissionUrl
     * @param attachment
     * @param abortSignal
     */
    postAttachment?(
        submissionUrl: string,
        attachment: BacktraceAttachment,
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<BacktraceAttachmentResponse>>;
}
