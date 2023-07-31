import { TimeHelper } from '../../common/TimeHelper';
import { BacktraceAttachment } from '../attachment';
import { BacktraceErrorType } from './BacktraceErrorType';
import { BacktraceReportStackTraceInfo } from './BacktraceReportStackTraceInfo';

export class BacktraceReport {
    /**
     * Report classifiers
     */
    public readonly classifiers: string[] = [];
    /**
     * Report annotations
     */
    public readonly annotations: Record<string, object> = {};
    /**
     * Report stack trace
     */
    public readonly stackTrace: Record<string, BacktraceReportStackTraceInfo> = {};

    /**
     * Report inner errors
     */
    public readonly innerReport: unknown[] = [];

    /**
     * Report timestamp in ms
     */
    public readonly timestamp = TimeHelper.now();

    /**
     * Sets how many top frames should be skipped.
     */
    public skipFrames = 0;

    /**
     * Add additional stack trace to the report.
     * If the thread name already exists it will be overwritten
     * @param name thread name
     * @param stack stack trace
     * @param message error message
     */
    public addStackTrace(name: string, stack: string, message: string) {
        this.stackTrace[name] = {
            stack,
            message,
        };
    }

    constructor(
        public readonly data: Error | string,
        public readonly attributes: Record<string, unknown> = {},
        public readonly attachments: BacktraceAttachment[] = [],
        options: { skipFrames?: number } = {},
    ) {
        this.skipFrames = options?.skipFrames ?? 0;
        let errorType: BacktraceErrorType = 'Exception';
        if (data instanceof Error) {
            this.annotations['error'] = data;
            this.classifiers = [data.name];
            const stackInfo = {
                stack: data.stack ?? '',
                message: data.message,
            };
            this.stackTrace['main'] = stackInfo;

            // Supported in ES2022
            if ((data as { cause?: unknown }).cause) {
                this.innerReport.push((data as { cause?: unknown }).cause);
            }
        } else {
            const stackInfo = {
                stack: new Error().stack ?? '',
                message: data,
            };
            this.stackTrace['main'] = stackInfo;
            errorType = 'Message';
            this.skipFrames += 1;
        }

        if (!this.attributes['error.type']) {
            this.attributes['error.type'] = errorType;
        }
        this.attributes['error.message'] = this.stackTrace['main']?.message ?? '';
    }
}
