import {
    BacktraceAttachment,
    BacktraceAttributeProvider,
    BacktraceConfiguration,
    BacktraceDatabaseRecord,
    BacktraceSessionProvider,
    DebugIdProvider,
    SdkOptions,
} from '.';
import { CoreClientSetup } from './builder/CoreClientSetup';
import { AttributeType, BacktraceData } from './model/data/BacktraceData';
import { BacktraceReportSubmission } from './model/http/BacktraceReportSubmission';
import { BacktraceReport } from './model/report/BacktraceReport';
import { AttributeManager } from './modules/attribute/AttributeManager';
import { ClientAttributeProvider } from './modules/attribute/ClientAttributeProvider';
import { UserAttributeProvider } from './modules/attribute/UserAttributeProvider';
import { BacktraceBreadcrumbs } from './modules/breadcrumbs';
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
     * Determines if the client is enabled.
     */
    public get enabled() {
        return this._enabled;
    }

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
        return this._attributeManager.get().attributes;
    }

    /**
     * Available cached client annotatations
     */
    public get annotations(): Record<string, unknown> {
        return this._attributeManager.get().annotations;
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
    private readonly _attributeManager: AttributeManager;
    private readonly _metrics?: BacktraceMetrics;
    private readonly _database?: BacktraceDatabase;
    private readonly _sessionProvider: BacktraceSessionProvider;
    private readonly _sdkOptions: SdkOptions;
    protected readonly options: BacktraceConfiguration;

    private _enabled = false;

    protected constructor(private readonly _setup: CoreClientSetup) {
        this.options = _setup.options;
        this._sdkOptions = _setup.sdkOptions;
        this._sessionProvider = this._setup.sessionProvider ?? new SingleSessionProvider();

        const stackTraceConverter = this._setup.stackTraceConverter ?? new V8StackTraceConverter();

        this._reportSubmission = new BacktraceReportSubmission(this.options, this._setup.requestHandler);

        const attributeProviders: BacktraceAttributeProvider[] = [
            new ClientAttributeProvider(this.agent, this.agentVersion, this._sessionProvider.sessionId),
        ];

        if (this._setup.attributeProviders) {
            attributeProviders.push(...this._setup.attributeProviders);
        }

        if (this._setup.options.userAttributes) {
            attributeProviders.push(new UserAttributeProvider(this._setup.options.userAttributes));
        }

        this._attributeManager = new AttributeManager(attributeProviders);

        this._dataBuilder = new BacktraceDataBuilder(
            this._sdkOptions,
            stackTraceConverter,
            this._attributeManager,
            new DebugIdProvider(stackTraceConverter, this._setup.debugIdMapProvider),
        );

        this.attachments = this.options.attachments ?? [];

        if (this._setup.databaseStorageProvider && this.options?.database?.enable === true) {
            this._database = new BacktraceDatabase(
                this.options.database,
                this._setup.databaseStorageProvider,
                this._reportSubmission,
            );
        }

        this._rateLimitWatcher = new RateLimitWatcher(this.options.rateLimit);

        const metrics = new MetricsBuilder(
            this.options,
            this._sessionProvider,
            this._attributeManager,
            this._setup.requestHandler,
        ).build();

        if (metrics) {
            this._metrics = metrics;
        }

        if (this.options.breadcrumbs?.enable !== false) {
            this.breadcrumbsManager = new BreadcrumbsManager(this.options?.breadcrumbs, this._setup.breadcrumbsSetup);
            this._attributeManager.addProvider(this.breadcrumbsManager);
            this.attachments.push(this.breadcrumbsManager.breadcrumbsStorage);
        }

        this.initialize();
        this._enabled = true;
    }

    /**
     * Add attribute to Backtrace Client reports.
     * @param attributes key-value object with attributes.
     */
    public addAttribute(attributes: Record<string, unknown>): void;
    /**
     * Add dynamic attributes to Backtrace Client reports.
     * @param attributes function returning key-value object with attributes.
     */
    public addAttribute(attributes: () => Record<string, unknown>): void;
    public addAttribute(attributes: Record<string, unknown> | (() => Record<string, unknown>)) {
        this._attributeManager.add(attributes);
    }

    /**
     * Asynchronously sends error data to Backtrace.
     * @param error Backtrace Report or error or message
     * @param attributes Report attributes
     * @param attachments Report attachments
     */
    public send(error: Error, attributes?: Record<string, unknown>, attachments?: BacktraceAttachment[]): Promise<void>;
    /**
     * Asynchronously sends a message report to Backtrace
     * @param message Report message
     * @param attributes Report attributes
     * @param attachments Report attachments
     */
    public send(
        message: string,
        attributes?: Record<string, unknown>,
        attachments?: BacktraceAttachment[],
    ): Promise<void>;
    /**
     * Asynchronously sends error data to Backtrace
     * @param report Backtrace Report
     */
    public send(report: BacktraceReport): Promise<void>;
    // This function CANNOT be an async function due to possible async state machine stack frame inclusion, which breaks the skip stacks
    public send(
        data: BacktraceReport | Error | string,
        reportAttributes: Record<string, unknown> = {},
        reportAttachments: BacktraceAttachment[] = [],
    ): Promise<void> {
        if (!this._enabled) {
            return Promise.resolve();
        }
        if (this._rateLimitWatcher.skipReport()) {
            return Promise.resolve();
        }

        const report = this.isReport(data)
            ? data
            : new BacktraceReport(data, reportAttributes, [], {
                  skipFrames: this.skipFrameOnMessage(data),
              });

        this.breadcrumbsManager?.logReport(report);
        if (this.options.skipReport && this.options.skipReport(report)) {
            return Promise.resolve();
        }

        const backtraceData = this.generateSubmissionData(report);
        if (!backtraceData) {
            return Promise.resolve();
        }

        const submissionAttachments = this.generateSubmissionAttachments(report, reportAttachments);
        const record = this.addToDatabase(backtraceData, submissionAttachments);

        return this._reportSubmission.send(backtraceData, submissionAttachments).then((submissionResult) => {
            if (!record) {
                return;
            }
            record.locked = false;
            if (submissionResult.status === 'Ok') {
                this._database?.remove(record);
            }
        });
    }

    /**
     * Disposes the client and all client callbacks
     */
    public dispose() {
        this._enabled = false;
        this.database?.dispose();
        this.breadcrumbsManager?.dispose();
        this._metrics?.dispose();
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

    private initialize() {
        this._database?.start();
        this._metrics?.start();
        this.breadcrumbsManager?.start();
        return this;
    }

    private generateSubmissionData(report: BacktraceReport): BacktraceData | undefined {
        const backtraceData = this._dataBuilder.build(report);
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
