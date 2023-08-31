import { jsonEscaper } from '../../common/jsonEscaper';
import { TimeHelper } from '../../common/TimeHelper';
import { BacktraceAttachment } from '../attachment';
import { BacktraceStackFrame } from '../data/BacktraceStackTrace';
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
    public readonly stackTrace: Record<string, BacktraceReportStackTraceInfo | BacktraceStackFrame[]> = {};

    /**
     * Report message
     */
    public readonly message: string;

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
    public addStackTrace(name: string, stack: string, message?: string): this;
    public addStackTrace(name: string, stackFrames: BacktraceStackFrame[]): this;
    public addStackTrace(name: string, stack: string | BacktraceStackFrame[], message = ''): this {
        if (typeof stack === 'string') {
            this.stackTrace[name] = {
                stack,
                message,
            };
        } else {
            this.stackTrace[name] = stack;
        }

        return this;
    }

    constructor(
        public readonly data: Error | string,
        public readonly attributes: Record<string, unknown> = {},
        public readonly attachments: BacktraceAttachment[] = [],
        options: { skipFrames?: number; classifiers?: string[]; timestamp?: number } = {},
    ) {
        this.skipFrames = options?.skipFrames ?? 0;
        let errorType: BacktraceErrorType = 'Exception';
        if (data instanceof Error) {
            this.message = this.generateErrorMessage(data.message);
            this.annotations['error'] = {
                ...data,
                message: this.message,
                name: data.name,
                stack: data.stack,
            };
            this.classifiers = [data.name];
            this.message = data.message;
            this.stackTrace['main'] = {
                stack: data.stack ?? '',
                message: this.message,
            };

            // Supported in ES2022
            if ((data as { cause?: unknown }).cause) {
                this.innerReport.push((data as { cause?: unknown }).cause);
            }
        } else {
            this.message = this.generateErrorMessage(data);
            this.stackTrace['main'] = {
                stack: new Error().stack ?? '',
                message: this.message,
            };
            this.classifiers = ['Message'];
            errorType = 'Message';
            this.skipFrames += 1;
        }

        if (!this.attributes['error.type']) {
            this.attributes['error.type'] = errorType;
        }
        this.attributes['error.message'] = this.message;

        if (options?.timestamp) {
            this.timestamp = options.timestamp;
        }
        if (options?.classifiers) {
            this.classifiers.unshift(...options.classifiers);
        }
    }

    private generateErrorMessage(data: unknown) {
        return typeof data === 'object' ? JSON.stringify(data, jsonEscaper()) : data?.toString() ?? '';
    }
}
