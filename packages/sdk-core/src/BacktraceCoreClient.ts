import {
    BacktraceAttachment,
    BacktraceAttributeProvider,
    BacktraceBreadcrumbs,
    BacktraceConfiguration,
    BacktraceSessionProvider,
    DebugIdProvider,
    SdkOptions,
} from '.';
import { CoreClientSetup } from './builder/CoreClientSetup';
import { Events } from './common/Events';
import { ReportEvents } from './events/ReportEvents';
import { AttributeType, BacktraceData } from './model/data/BacktraceData';
import { BacktraceReportSubmission } from './model/http/BacktraceReportSubmission';
import { BacktraceReport } from './model/report/BacktraceReport';
import { BacktraceModules, ReadonlyBacktraceModules } from './modules/BacktraceModules';
import { AttributeManager } from './modules/attribute/AttributeManager';
import { ClientAttributeProvider } from './modules/attribute/ClientAttributeProvider';
import { UserAttributeProvider } from './modules/attribute/UserAttributeProvider';
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
     * Backtrace client instance
     */
    protected static _instance?: BacktraceCoreClient;

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
        return this.attributeManager.get().attributes;
    }

    /**
     * Available cached client annotatations
     */
    public get annotations(): Record<string, unknown> {
        return this.attributeManager.get().annotations;
    }

    public get metrics(): BacktraceMetrics | undefined {
        return this._modules.get(BacktraceMetrics);
    }

    public get breadcrumbs(): BacktraceBreadcrumbs | undefined {
        return this._modules.get(BreadcrumbsManager);
    }

    public get database(): BacktraceDatabase | undefined {
        return this._modules.get(BacktraceDatabase);
    }

    /**
     * Client cached attachments
     */
    public get attachments(): readonly BacktraceAttachment[] {
        // always return a copy of attachments
        return [...this._attachments];
    }

    /**
     * Modules used by the client
     */
    protected get modules(): ReadonlyBacktraceModules {
        return this._modules;
    }

    public readonly reportEvents: Events<ReportEvents>;

    protected readonly attributeManager: AttributeManager;
    protected readonly options: BacktraceConfiguration;

    private readonly _modules: BacktraceModules = new Map();
    private readonly _attachments: BacktraceAttachment[];
    private readonly _dataBuilder: BacktraceDataBuilder;
    private readonly _reportSubmission: BacktraceReportSubmission;
    private readonly _rateLimitWatcher: RateLimitWatcher;
    private readonly _sessionProvider: BacktraceSessionProvider;
    private readonly _sdkOptions: SdkOptions;

    private _enabled = false;

    protected constructor(private readonly _setup: CoreClientSetup) {
        this.reportEvents = new Events();

        this.options = _setup.options;
        this._sdkOptions = _setup.sdkOptions;
        this._attachments = this.options.attachments ?? [];
        this._sessionProvider = this._setup.sessionProvider ?? new SingleSessionProvider();
        this._reportSubmission = new BacktraceReportSubmission(this.options, this._setup.requestHandler);
        this._rateLimitWatcher = new RateLimitWatcher(this.options.rateLimit);

        const attributeProviders: BacktraceAttributeProvider[] = [
            new ClientAttributeProvider(this.agent, this.agentVersion, this._sessionProvider.sessionId),
        ];

        if (this._setup.attributeProviders) {
            attributeProviders.push(...this._setup.attributeProviders);
        }

        if (this._setup.options.userAttributes) {
            attributeProviders.push(new UserAttributeProvider(this._setup.options.userAttributes));
        }

        this.attributeManager = new AttributeManager(attributeProviders);

        const stackTraceConverter = this._setup.stackTraceConverter ?? new V8StackTraceConverter();
        this._dataBuilder = new BacktraceDataBuilder(
            this._sdkOptions,
            stackTraceConverter,
            this.attributeManager,
            new DebugIdProvider(stackTraceConverter, this._setup.debugIdMapProvider),
        );

        if (this._setup.databaseStorageProvider && this.options?.database?.enable === true) {
            const database = new BacktraceDatabase(
                this.options.database,
                this._setup.databaseStorageProvider,
                this._reportSubmission,
            );

            this._modules.set(BacktraceDatabase, database);
        }

        const metrics = new MetricsBuilder(
            this.options,
            this._sessionProvider,
            this.attributeManager,
            this._setup.requestHandler,
        ).build();

        if (metrics) {
            this._modules.set(BacktraceMetrics, metrics);
        }

        if (this.options.breadcrumbs?.enable !== false) {
            const breadcrumbsManager = new BreadcrumbsManager(this.options?.breadcrumbs, this._setup.breadcrumbsSetup);
            this._attachments.push(breadcrumbsManager.breadcrumbsStorage);
            this.attributeManager.addProvider(breadcrumbsManager);
            this._modules.set(BreadcrumbsManager, breadcrumbsManager);
        }

        this._enabled = true;
    }

    public initialize() {
        for (const module of this._modules.values()) {
            if (module.bind) {
                module.bind(this);
            }
            module.initialize();
        }
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
        this.attributeManager.add(attributes);
    }

    /**
     * Add attachment to the client
     * @param attachment attachment
     */
    public addAttachment(attachment: BacktraceAttachment): void {
        this._attachments.push(attachment);
    }

    /**
     * Asynchronously sends error data to Backtrace.
     * @param error Error or message
     * @param attributes Report attributes
     * @param attachments Report attachments
     */
    public send(
        error: Error | string,
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

        this.reportEvents.emit('before-skip', report);

        if (this.options.skipReport && this.options.skipReport(report)) {
            return Promise.resolve();
        }

        const backtraceData = this.generateSubmissionData(report);
        if (!backtraceData) {
            return Promise.resolve();
        }

        const submissionAttachments = this.generateSubmissionAttachments(report, reportAttachments);

        this.reportEvents.emit('before-send', report, backtraceData, submissionAttachments);

        return this._reportSubmission.send(backtraceData, submissionAttachments).then((submissionResult) => {
            this.reportEvents.emit('after-send', report, backtraceData, submissionAttachments, submissionResult);
        });
    }

    /**
     * Disposes the client and all client callbacks
     */
    public dispose() {
        this._enabled = false;
        for (const module of this._modules.values()) {
            if (module.dispose) {
                module.dispose();
            }
        }
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
        return [...this._attachments, ...(report.attachments ?? []), ...(reportAttachments ?? [])];
    }

    private skipFrameOnMessage(data: Error | string): number {
        return typeof data === 'string' ? 1 : 0;
    }

    private isReport(data: BacktraceReport | Error | string): data is BacktraceReport {
        return data instanceof BacktraceReport;
    }
}
