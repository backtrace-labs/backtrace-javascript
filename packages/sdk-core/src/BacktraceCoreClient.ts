import { CoreClientSetup } from './builder/CoreClientSetup.js';
import { Events } from './common/Events.js';
import { ClientEvents } from './events/ClientEvents.js';
import {
    BacktraceAttachment,
    BacktraceAttributeProvider,
    BacktraceBreadcrumbs,
    BacktraceConfiguration,
    BacktraceReportSubmissionResult,
    BacktraceRequestHandler,
    BacktraceSessionProvider,
    BacktraceSubmissionResponse,
    DebugIdProvider,
    FileSystem,
    SdkOptions,
    SessionFiles,
} from './index.js';
import { AttributeType, BacktraceData } from './model/data/BacktraceData.js';
import { BacktraceReportSubmission, RequestBacktraceReportSubmission } from './model/http/BacktraceReportSubmission.js';
import { BacktraceReport } from './model/report/BacktraceReport.js';
import { AttachmentManager } from './modules/attachments/AttachmentManager.js';
import { AttributeManager } from './modules/attribute/AttributeManager.js';
import { ClientAttributeProvider } from './modules/attribute/ClientAttributeProvider.js';
import { UserAttributeProvider } from './modules/attribute/UserAttributeProvider.js';
import { BacktraceModule, BacktraceModuleBindData } from './modules/BacktraceModule.js';
import { BacktraceModuleCtor, BacktraceModules, ReadonlyBacktraceModules } from './modules/BacktraceModules.js';
import { BreadcrumbsManager } from './modules/breadcrumbs/BreadcrumbsManager.js';
import { V8StackTraceConverter } from './modules/converter/V8StackTraceConverter.js';
import { BacktraceDataBuilder } from './modules/data/BacktraceDataBuilder.js';
import { BacktraceDatabase } from './modules/database/BacktraceDatabase.js';
import { BacktraceDatabaseFileStorageProvider } from './modules/database/BacktraceDatabaseFileStorageProvider.js';
import { BacktraceMetrics } from './modules/metrics/BacktraceMetrics.js';
import { MetricsBuilder } from './modules/metrics/MetricsBuilder.js';
import { SingleSessionProvider } from './modules/metrics/SingleSessionProvider.js';
import { RateLimitWatcher } from './modules/rateLimiter/RateLimitWatcher.js';

export abstract class BacktraceCoreClient<
    O extends BacktraceConfiguration = BacktraceConfiguration,
> extends Events<ClientEvents> {
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
        return this.attachmentManager.get();
    }

    /**
     * Modules used by the client
     */
    protected get modules(): ReadonlyBacktraceModules {
        return this._modules;
    }

    protected get sessionFiles() {
        return this._modules.get(SessionFiles);
    }

    protected readonly options: O;

    protected readonly attributeManager: AttributeManager;
    protected readonly attachmentManager: AttachmentManager;
    protected readonly fileSystem?: FileSystem;

    private readonly _modules: BacktraceModules = new Map();
    private readonly _dataBuilder: BacktraceDataBuilder;
    private readonly _reportSubmission: BacktraceReportSubmission;
    private readonly _rateLimitWatcher: RateLimitWatcher;
    private readonly _sessionProvider: BacktraceSessionProvider;
    private readonly _sdkOptions: SdkOptions;
    private readonly _requestHandler: BacktraceRequestHandler;

    private _enabled = false;

    protected constructor(setup: CoreClientSetup<O>) {
        super();

        this.options = setup.options;
        this.fileSystem = setup.fileSystem;
        this._sdkOptions = setup.sdkOptions;
        this._sessionProvider = setup.sessionProvider ?? new SingleSessionProvider();
        this._reportSubmission =
            setup.reportSubmission ?? new RequestBacktraceReportSubmission(this.options, setup.requestHandler);
        this._rateLimitWatcher = new RateLimitWatcher(this.options.rateLimit);
        this._requestHandler = setup.requestHandler;

        const attributeProviders: BacktraceAttributeProvider[] = [
            new ClientAttributeProvider(this.agent, this.agentVersion, this._sessionProvider.sessionId),
        ];

        if (setup.attributeProviders) {
            attributeProviders.push(...setup.attributeProviders);
        }

        if (this.options.userAttributes) {
            attributeProviders.push(new UserAttributeProvider(this.options.userAttributes));
        }

        this.attributeManager = new AttributeManager(attributeProviders);
        this.attachmentManager = new AttachmentManager();
        if (this.options.attachments) {
            this.attachmentManager.add(...this.options.attachments);
        }

        const stackTraceConverter = setup.stackTraceConverter ?? new V8StackTraceConverter();
        this._dataBuilder = new BacktraceDataBuilder(
            this._sdkOptions,
            stackTraceConverter,
            this.attributeManager,
            new DebugIdProvider(stackTraceConverter, setup.debugIdMapProvider),
        );

        if (this.options?.database?.enable === true && setup.fileSystem) {
            const provider = BacktraceDatabaseFileStorageProvider.createIfValid(
                setup.fileSystem,
                this.options.database,
            );

            if (this.fileSystem) {
                const sessionFiles = new SessionFiles(
                    this.fileSystem,
                    this.options.database.path,
                    {
                        id: this.sessionId,
                        timestamp: Date.now(),
                    },
                    this.options.database.maximumOldSessions ?? 1,
                );
                this._modules.set(SessionFiles, sessionFiles);
            }

            if (provider) {
                const database = new BacktraceDatabase(
                    this.options.database,
                    provider,
                    this._reportSubmission,
                    this.sessionFiles,
                );
                this._modules.set(BacktraceDatabase, database);
            }
        }

        const metrics = new MetricsBuilder(
            this.options,
            this._sessionProvider,
            this.attributeManager,
            setup.requestHandler,
        ).build(setup.uniqueMetricsQueue, setup.summedMetricsQueue);

        if (metrics) {
            this._modules.set(BacktraceMetrics, metrics);
        }

        if (this.options.breadcrumbs?.enable !== false) {
            const breadcrumbsManager = new BreadcrumbsManager(this.options?.breadcrumbs, setup.breadcrumbsSetup);
            this._modules.set(BreadcrumbsManager, breadcrumbsManager);
        }

        if (setup.modules) {
            for (const module of setup.modules) {
                this.addModule(module);
            }
        }
    }

    public initialize() {
        this.validateAttributes();

        if (this.fileSystem && this.options.database?.createDatabaseDirectory) {
            if (!this.options.database.path) {
                throw new Error(
                    'Missing mandatory path to the database. Please define the database.path option in the configuration.',
                );
            }

            this.fileSystem.createDirSync(this.options.database?.path);
        }

        for (const module of this._modules.values()) {
            if (module.bind) {
                module.bind(this.getModuleBindData());
            }

            if (module.initialize) {
                module.initialize();
            }
        }

        this.sessionFiles?.clearPreviousSessions();

        this._enabled = true;
        BacktraceCoreClient._instance = this;
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
    public addAttachment(...attachments: BacktraceAttachment[]): void;
    public addAttachment(...attachments: Array<() => BacktraceAttachment>): void;
    public addAttachment(...attachments: Array<BacktraceAttachment | (() => BacktraceAttachment)>): void {
        this.attachmentManager.add(...attachments);
    }

    /**
     * Asynchronously sends error data to Backtrace.
     * @param error Error or message
     * @param attributes Report attributes
     * @param attachments Report attachments
     * @param abortSignal Signal to abort sending
     */
    public send(
        error: Error | string,
        attributes?: Record<string, unknown>,
        attachments?: BacktraceAttachment[],
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<BacktraceSubmissionResponse>>;
    /**
     * Asynchronously sends error data to Backtrace
     * @param report Backtrace Report
     * @param abortSignal Signal to abort sending
     */
    public send(
        report: BacktraceReport,
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<BacktraceSubmissionResponse>>;
    // This function CANNOT be an async function due to possible async state machine stack frame inclusion, which breaks the skip stacks
    public send(
        data: BacktraceReport | Error | string,
        reportAttributesOrAbortSignal?: Record<string, unknown> | AbortSignal,
        reportAttachments: BacktraceAttachment[] = [],
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<BacktraceSubmissionResponse>> {
        if (!this._enabled) {
            return Promise.resolve(BacktraceReportSubmissionResult.SdkDisabled());
        }
        if (this._rateLimitWatcher.skipReport()) {
            return Promise.resolve(BacktraceReportSubmissionResult.OnLimitReached('Client'));
        }

        // If data is BacktraceReport, we know that the second argument should be only AbortSignal
        const reportAttributes = !this.isReport(data)
            ? (reportAttributesOrAbortSignal as Record<string, unknown>)
            : undefined;

        // If data is BacktraceReport, we know that the second argument should be only AbortSignal
        abortSignal = !this.isReport(data) ? abortSignal : (reportAttributesOrAbortSignal as AbortSignal);

        const report = this.isReport(data)
            ? data
            : new BacktraceReport(data, reportAttributes, [], {
                  skipFrames: this.skipFrameOnMessage(data),
              });

        this.emit('before-skip', report);

        if (this.options.skipReport && this.options.skipReport(report)) {
            return Promise.resolve(BacktraceReportSubmissionResult.ReportSkipped());
        }

        const backtraceData = this.generateSubmissionData(report);
        if (!backtraceData) {
            return Promise.resolve(BacktraceReportSubmissionResult.ReportSkipped());
        }

        const submissionAttachments = this.generateSubmissionAttachments(report, reportAttachments);

        this.emit('before-send', report, backtraceData, submissionAttachments);

        return this._reportSubmission
            .send(backtraceData, submissionAttachments, abortSignal)
            .then((submissionResult) => {
                this.emit('after-send', report, backtraceData, submissionAttachments, submissionResult);
                return submissionResult;
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

        BacktraceCoreClient.destroy();
    }

    protected addModule<T extends BacktraceModule>(module: T): void;
    protected addModule<T extends BacktraceModule>(type: BacktraceModuleCtor<T>, module: T): void;
    protected addModule<T extends BacktraceModule>(typeOrModule: BacktraceModuleCtor<T> | T, module?: T) {
        let type: BacktraceModuleCtor<T>;
        if (typeof typeOrModule === 'function') {
            type = typeOrModule;
        } else {
            module = typeOrModule;
            type = Object.getPrototypeOf(module);
        }

        if (!module) {
            throw new Error('Module implementation is required.');
        }

        this._modules.set(type, module);

        if (this._enabled) {
            module.bind && module.bind(this.getModuleBindData());
            module.initialize && module.initialize();
        }
    }

    protected generateSubmissionData(report: BacktraceReport): BacktraceData | undefined {
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
        return [...this.attachmentManager.get(), ...(report.attachments ?? []), ...(reportAttachments ?? [])];
    }

    private skipFrameOnMessage(data: Error | string): number {
        return typeof data === 'string' ? 1 : 0;
    }

    private isReport(data: BacktraceReport | Error | string): data is BacktraceReport {
        return data instanceof BacktraceReport;
    }

    private getModuleBindData(): BacktraceModuleBindData {
        return {
            client: this,
            options: this.options,
            attributeManager: this.attributeManager,
            attachmentManager: this.attachmentManager,
            reportSubmission: this._reportSubmission,
            requestHandler: this._requestHandler,
            database: this.database,
            sessionFiles: this.sessionFiles,
            fileSystem: this.fileSystem,
        };
    }

    private static destroy() {
        this._instance = undefined;
    }

    private validateAttributes() {
        function validateApplicationAndVersion(attributes: Record<string, unknown>) {
            if (!attributes['application'] || !attributes['application.version']) {
                return 'application and application.version attributes must be defined.';
            }
        }

        // Validate scoped attributes first. If they return no errors, there is no point
        // in checking all attributes, which resolving of may be slower.
        const scoped = this.attributeManager.get('scoped');
        const scopedError = validateApplicationAndVersion(scoped.attributes);
        if (!scopedError) {
            return;
        }

        const allAttributes = this.attributeManager.get();
        const error = validateApplicationAndVersion(allAttributes.attributes);
        if (!error) {
            return;
        }

        throw new Error(error);
    }
}
