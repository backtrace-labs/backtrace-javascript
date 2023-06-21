import { BacktraceAttachment, BacktraceAttributeProvider, BacktraceStackTraceConverter } from '.';
import { SdkOptions } from './builder/SdkOptions';
import { IdGenerator } from './common/IdGenerator';
import { BacktraceConfiguration } from './model/configuration/BacktraceConfiguration';
import { AttributeType } from './model/data/BacktraceData';
import { BacktraceReportSubmission } from './model/http/BacktraceReportSubmission';
import { BacktraceRequestHandler } from './model/http/BacktraceRequestHandler';
import { BacktraceReport } from './model/report/BacktraceReport';
import { AttributeManager } from './modules/attribute/AttributeManager';
import { ClientAttributeProvider } from './modules/attribute/ClientAttributeProvider';
import { V8StackTraceConverter } from './modules/converter/V8StackTraceConverter';
import { BacktraceDataBuilder } from './modules/data/BacktraceDataBuilder';
import { RateLimitWatcher } from './modules/rateLimiter/RateLimitWatcher';
export abstract class BacktraceCoreClient {
    /**
     * Current session id
     */
    public get sessionId(): string {
        return this._sessionId;
    }

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

    /**
     * Available cached client attributes
     */
    public get attributes(): Record<string, AttributeType> {
        return this._attributeProvider.attributes;
    }

    /**
     * Available cached client annotatations
     */
    public get annotations(): Record<string, unknown> {
        return this._attributeProvider.annotations;
    }

    /**
     * Client cached attachments
     */
    public readonly attachments: BacktraceAttachment[];

    private readonly _dataBuilder: BacktraceDataBuilder;
    private readonly _reportSubmission: BacktraceReportSubmission;
    private readonly _rateLimitWatcher: RateLimitWatcher;
    private readonly _attributeProvider: AttributeManager;

    /**
     * Current session Id
     */
    private readonly _sessionId: string = IdGenerator.uuid();

    protected constructor(
        protected readonly options: BacktraceConfiguration,
        private readonly _sdkOptions: SdkOptions,
        requestHandler: BacktraceRequestHandler,
        attributeProviders: BacktraceAttributeProvider[] = [],
        stackTraceConverter: BacktraceStackTraceConverter = new V8StackTraceConverter(),
    ) {
        this._dataBuilder = new BacktraceDataBuilder(this._sdkOptions, stackTraceConverter);
        this._reportSubmission = new BacktraceReportSubmission(options, requestHandler);
        this._rateLimitWatcher = new RateLimitWatcher(options.rateLimit);
        this._attributeProvider = new AttributeManager([
            new ClientAttributeProvider(_sdkOptions.agentVersion, this._sessionId, options.userAttributes ?? {}),
            ...(attributeProviders ?? []),
        ]);
        this.attachments = options.attachments ?? [];
    }

    /**
     * Add attribute to Backtrace Client reports.
     * @param attributes key-value object with attributes.
     */
    public addAttribute(attributes: Record<string, unknown>) {
        this._attributeProvider.add(attributes);
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
        reportAttributes: Record<string, unknown> = {},
        reportAttachments: BacktraceAttachment[] = [],
    ): Promise<void> {
        if (this._rateLimitWatcher.skipReport()) {
            return;
        }

        const report = this.isReport(data)
            ? data
            : new BacktraceReport(data, reportAttributes, [], {
                  skipFrames: this.skipFrameOnMessage(data),
              });

        const { annotations, attributes } = this._attributeProvider.get();
        const backtraceData = this._dataBuilder.build(report, attributes, annotations);
        await this._reportSubmission.send(backtraceData, this.generateSubmissionAttachments(report, reportAttachments));
    }

    private generateSubmissionAttachments(
        report: BacktraceReport,
        reportAttachments: BacktraceAttachment[],
    ): BacktraceAttachment[] {
        return [...this.attachments, ...(report.attachments ?? []), ...(reportAttachments ?? [])];
    }

    private skipFrameOnMessage(data: Error | string): number {
        return typeof data === 'string' ? 1 : 0;
    }

    private isReport(data: BacktraceReport | Error | string): data is BacktraceReport {
        return data instanceof BacktraceReport;
    }
}
