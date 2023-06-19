import { TimeHelper } from '../../common/TimeHelper';
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

    /**
     * Report timestamp in sec
     */
    public readonly timestamp = TimeHelper.timeNowInSec();

    /**
     * Sets how many top frames should be skipped.
     */
    public skipFrames = 0;

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
            this.message = data.message;
            this.stackTrace = data.stack ?? '';

            // Supported in ES2022
            if ((data as { cause?: unknown }).cause) {
                this.innerReport.push((data as { cause?: unknown }).cause);
            }
        } else {
            this.message = data;
            this.stackTrace = new Error().stack ?? '';
            errorType = 'Message';
            this.skipFrames += 1;
        }

        if (!this.attributes['error.type']) {
            this.attributes['error.type'] = errorType;
        }
        this.attributes['error.message'] = this.message;
    }
}
