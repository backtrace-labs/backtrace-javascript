import { BacktraceAttachment } from './BacktraceAttachment';

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
    public readonly stackTrace: string[];

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
        let errorType: string = 'Exception';
        if (data instanceof Error) {
            this.annotations['error'] = data;
            this.classifiers = [data.name];
            this.message = data.message;
            this.stackTrace = this.generateStackTrace(data);
            if (data.cause) {
                this.innerReport.push(data.cause);
            }
        } else {
            this.message = data;
            this.stackTrace = this.generateStackTrace(new Error());
            errorType = 'Message';
        }

        if (!this.attributes['error.type']) {
            this.attributes['error.type'] = errorType;
        }
    }

    private generateStackTrace(data: Error): string[] {
        const stackTrace = data?.stack ?? new Error().stack;
        if (!stackTrace) {
            return [];
        }
        // slice stack frame by 1 frame to avoid adding a from the library
        // to the client stack trace.
        return stackTrace.split('\n').slice(1);
    }
}
