import { BacktraceAttachment } from './model/report/BacktraceAttachment';
import { BacktraceReport } from './model/report/BacktraceReport';
import { BacktraceStackTraceConverter } from './modules/converter/BacktraceStackTraceConverter';
import { V8StackTraceConverter } from './modules/converter/V8StackTraceConverter';

export class BacktraceCoreClient {
    constructor(private readonly _stackTraceConverter: BacktraceStackTraceConverter = new V8StackTraceConverter()) {}
    /**
     * Asynchronously sends error data to Backtrace.
     * @param error Backtrace Report or error or message
     * @param attributes Report attributes
     * @param attachments Report attachments
     */
    public async send(
        error: Error,
        attributes?: Record<string, unknown>,
        attachments?: BacktraceAttachment[],
    ): Promise<void>;
    /**
     * Asynchronously sends a message report to Backtrace
     * @param message Report message
     * @param attributes Report attributes
     * @param attachments Report attachments
     */
    public async send(
        message: string,
        attributes?: Record<string, unknown>,
        attachments?: BacktraceAttachment[],
    ): Promise<void>;
    /**
     * Asynchronously sends error data to Backtrace
     * @param report Backtrace Report
     */

    public async send(report: BacktraceReport): Promise<void>;
    public async send(
        data: BacktraceReport | Error | string,
        attributes: Record<string, unknown> = {},
        attachments: BacktraceAttachment[] = [],
    ): Promise<void> {
        const report = this.isReport(data)
            ? data
            : new BacktraceReport(data, attributes, attachments, {
                  skipFrames: this.skipFrameOnMessage(data),
              });

        console.log(this._stackTraceConverter.convert(report));
    }

    private skipFrameOnMessage(data: Error | string): number {
        return typeof data === 'string' ? 1 : 0;
    }

    private isReport(data: BacktraceReport | Error | string): data is BacktraceReport {
        return data instanceof BacktraceReport;
    }
}
