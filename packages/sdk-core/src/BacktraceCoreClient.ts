import { BacktraceStackTraceConverter } from '.';
import { SdkOptions } from './builder/SdkOptions';
import { BacktraceConfiguration } from './model/configuration/BacktraceConfiguration';
import { BacktraceReportSubmission } from './model/http/BacktraceReportSubmission';
import { BacktraceRequestHandler } from './model/http/BacktraceRequestHandler';
import { BacktraceAttachment } from './model/report/BacktraceAttachment';
import { BacktraceReport } from './model/report/BacktraceReport';
import { ReportConverter } from './modules/converter/ReportConverter';
import { V8StackTraceConverter } from './modules/converter/V8StackTraceConverter';
import { RateLimitWatcher } from './modules/rateLimiter/RateLimitWatcher';
export abstract class BacktraceCoreClient {
    /**
     * Backtrace SDK name
     */
    public get agent(): string {
        return this._sdkOptions.agent;
    }
    /**
     * Backtrace SDK version
     */
    public get agentVersion(): string {
        return this._sdkOptions.agentVersion;
    }

    private readonly _reportConverter: ReportConverter;
    private readonly _reportSubmission: BacktraceReportSubmission;
    private readonly _rateLimitWatcher: RateLimitWatcher;

    protected constructor(
        protected readonly options: BacktraceConfiguration,
        private readonly _sdkOptions: SdkOptions,
        requestHandler: BacktraceRequestHandler,
        stackTraceConverter: BacktraceStackTraceConverter = new V8StackTraceConverter(),
    ) {
        this._reportConverter = new ReportConverter(this._sdkOptions, stackTraceConverter);
        this._reportSubmission = new BacktraceReportSubmission(options, requestHandler);
        this._rateLimitWatcher = new RateLimitWatcher(options.rateLimit);
    }

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
        if (this._rateLimitWatcher.skipReport()) {
            return;
        }

        const report = this.isReport(data)
            ? data
            : new BacktraceReport(data, attributes, attachments, {
                  skipFrames: this.skipFrameOnMessage(data),
              });

        const backtraceData = this._reportConverter.convert(report, {}, {});
        await this._reportSubmission.send(backtraceData, attachments);
    }

    private skipFrameOnMessage(data: Error | string): number {
        return typeof data === 'string' ? 1 : 0;
    }

    private isReport(data: BacktraceReport | Error | string): data is BacktraceReport {
        return data instanceof BacktraceReport;
    }
}
