import { BacktraceAttachment } from '../attachment';
import { BacktraceSubmissionResponse } from './model/BacktraceSubmissionResponse';
import { BacktraceReportSubmissionResult } from './model/BacktraceSubmissionResult';
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
    ): Promise<BacktraceReportSubmissionResult<BacktraceSubmissionResponse>>;

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
}
