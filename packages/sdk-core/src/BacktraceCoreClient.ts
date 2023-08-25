import {
    BacktraceAttachment,
    BacktraceAttributeProvider,
    BacktraceDatabaseRecord,
    BacktraceDatabaseStorageProvider,
    BacktraceSessionProvider,
    BacktraceStackTraceConverter,
    DebugIdMapProvider,
    DebugIdProvider,
} from '.';
import { SdkOptions } from './builder/SdkOptions';
import { BacktraceConfiguration } from './model/configuration/BacktraceConfiguration';
import { AttributeType, BacktraceData } from './model/data/BacktraceData';
import { BacktraceReportSubmission } from './model/http/BacktraceReportSubmission';
import { BacktraceRequestHandler } from './model/http/BacktraceRequestHandler';
import { BacktraceReport } from './model/report/BacktraceReport';
import { AttributeManager } from './modules/attribute/AttributeManager';
import { ClientAttributeProvider } from './modules/attribute/ClientAttributeProvider';
import { BacktraceBreadcrumbs, BreadcrumbsSetup } from './modules/breadcrumbs';
import { BreadcrumbsManager } from './modules/breadcrumbs/BreadcrumbsManager';
import { V8StackTraceConverter } from './modules/converter/V8StackTraceConverter';
import { BacktraceDataBuilder } from './modules/data/BacktraceDataBuilder';
import { BacktraceDatabase } from './modules/database/BacktraceDatabase';
import { BacktraceMetrics } from './modules/metrics/BacktraceMetrics';
import { MetricsBuilder } from './modules/metrics/MetricsBuilder';
import { SingleSessionProvider } from './modules/metrics/SingleSessionProvider';
import { RateLimitWatcher } from './modules/rateLimiter/RateLimitWatcher';
export abstract class BacktraceCoreClient {
    /**
     * Current session id
     */
    public get sessionId(): string {
        return this._sessionProvider.sessionId;
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

    public get metrics(): BacktraceMetrics | undefined {
        return this._metrics;
    }

    public get breadcrumbs(): BacktraceBreadcrumbs | undefined {
        return this.breadcrumbsManager;
    }

    /**
     * Report database used by the client
     */
    public get database(): BacktraceDatabase | undefined {
        return this._database;
    }

    /**
     * Client cached attachments
     */
    public readonly attachments: BacktraceAttachment[];

    protected readonly breadcrumbsManager?: BreadcrumbsManager;
    private readonly _dataBuilder: BacktraceDataBuilder;
    private readonly _reportSubmission: BacktraceReportSubmission;
    private readonly _rateLimitWatcher: RateLimitWatcher;
    private readonly _attributeProvider: AttributeManager;
    private readonly _metrics?: BacktraceMetrics;
    private readonly _database?: BacktraceDatabase;

    protected constructor(
        protected readonly options: BacktraceConfiguration,
        private readonly _sdkOptions: SdkOptions,
        requestHandler: BacktraceRequestHandler,
        attributeProviders: BacktraceAttributeProvider[] = [],
        stackTraceConverter: BacktraceStackTraceConverter = new V8StackTraceConverter(),
        private readonly _sessionProvider: BacktraceSessionProvider = new SingleSessionProvider(),
        debugIdMapProvider?: DebugIdMapProvider,
        breadcrumbsSetup?: BreadcrumbsSetup,
        databaseStorageProvider?: BacktraceDatabaseStorageProvider,
    ) {
        this._dataBuilder = new BacktraceDataBuilder(
            this._sdkOptions,
            stackTraceConverter,
            new DebugIdProvider(stackTraceConverter, debugIdMapProvider),
        );

        this._reportSubmission = new BacktraceReportSubmission(options, requestHandler);
        this._attributeProvider = new AttributeManager([
            new ClientAttributeProvider(
                _sdkOptions.agent,
                _sdkOptions.agentVersion,
                _sessionProvider.sessionId,
                options.userAttributes ?? {},
            ),
            ...(attributeProviders ?? []),
        ]);
        this.attachments = options.attachments ?? [];

        if (databaseStorageProvider && options?.database?.enabled === true) {
            this._database = new BacktraceDatabase(
                this.options.database,
                databaseStorageProvider,
                this._reportSubmission,
            );
        }

        this._rateLimitWatcher = new RateLimitWatcher(options.rateLimit);

        const metrics = new MetricsBuilder(options, _sessionProvider, this._attributeProvider, requestHandler).build();
        if (metrics) {
            this._metrics = metrics;
        }

        if (options.breadcrumbs?.enable !== false) {
            this.breadcrumbsManager = new BreadcrumbsManager(options?.breadcrumbs, breadcrumbsSetup);
            this._attributeProvider.addProvider(this.breadcrumbsManager);
            this.attachments.push(this.breadcrumbsManager.breadcrumbsStorage);
        }
    }

    protected initialize() {
        this._database?.start();
        this._metrics?.start();
        this.breadcrumbsManager?.start();
        return this;
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

        this.breadcrumbsManager?.logReport(report);
        if (this.options.skipReport && this.options.skipReport(report)) {
            return;
        }

        const backtraceData = this.generateSubmissionData(report);
        if (!backtraceData) {
            return;
        }

        const submissionAttachments = this.generateSubmissionAttachments(report, reportAttachments);
        const record = this.addToDatabase(backtraceData, submissionAttachments);

        const submissionResult = await this._reportSubmission.send(backtraceData, submissionAttachments);
        if (!record) {
            return;
        }
        record.locked = false;
        if (submissionResult.status === 'Ok') {
            this._database?.remove(record);
        }
    }

    /**
     * Disposes the client and all client callbacks
     */
    public dispose() {
        this.database?.dispose();
        this.breadcrumbsManager?.dispose();
    }

    private addToDatabase(
        data: BacktraceData,
        attachments: BacktraceAttachment[],
    ): BacktraceDatabaseRecord | undefined {
        if (!this._database) {
            return undefined;
        }

        const record = this._database.add(data, attachments);

        if (!record || record.locked || record.count !== 1) {
            return undefined;
        }

        record.locked = true;
        return record;
    }

    private generateSubmissionData(report: BacktraceReport): BacktraceData | undefined {
        const { annotations, attributes } = this._attributeProvider.get();
        const backtraceData = this._dataBuilder.build(report, attributes, annotations);
        if (!this.options.beforeSend) {
            return backtraceData;
        }
        return this.options.beforeSend(backtraceData);
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
