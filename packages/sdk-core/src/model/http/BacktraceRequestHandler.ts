import { BacktraceData } from '../data/BacktraceData';
import { BacktraceAttachment } from '../report/BacktraceAttachment';
import { BacktraceSubmissionResponse } from './model/BacktraceSubmissionResponse';
import { BacktraceReportSubmissionResult } from './model/BacktraceSubmissionResult';
export const DEFAULT_TIMEOUT = 15_000;
export interface BacktraceRequestHandler {
    /**
     * Submits error to Backtrace submission API
     * @param submissionUrl error submission URL
     * @param data Backtrace Data
     * @param attachments Report attachments
     * @returns Submission result
     */
    postError(
        submissionUrl: string,
        data: BacktraceData,
        attachments: BacktraceAttachment[],
    ): Promise<BacktraceReportSubmissionResult<BacktraceSubmissionResponse>>;

    /**
     * Post data to Backtrace API
     * @param submissionUrl data submission URL
     * @param payload request payload
     */
    post<T>(submissionUrl: string, payload: string): Promise<BacktraceReportSubmissionResult<T>>;
}
