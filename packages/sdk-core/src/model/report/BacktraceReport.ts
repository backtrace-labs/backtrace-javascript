import { BacktraceAttachment } from './BacktraceAttachment';
import { BacktraceErrorType } from './BacktraceErrorType';

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
    public readonly stackTrace: string;

    /**
     * Report message
     */
    public readonly message: string;

    /**
     * Report inner errors
     */
    public readonly innerReport: unknown[] = [];

    constructor(
        public readonly data: Error | string,
        public readonly attributes: Record<string, unknown> = {},
        public readonly attachments: BacktraceAttachment[] = [],
    ) {
        let errorType: BacktraceErrorType = 'Exception';
        if (data instanceof Error) {
            this.annotations['error'] = data;
            this.classifiers = [data.name];
            this.message = data.message;
            this.stackTrace = data.stack ?? '';
            if (data.cause) {
                this.innerReport.push(data.cause);
            }
        } else {
            this.message = data;
            this.stackTrace = new Error().stack ?? '';
            errorType = 'Message';
        }

        if (!this.attributes['error.type']) {
            this.attributes['error.type'] = errorType;
        }
    }
}
