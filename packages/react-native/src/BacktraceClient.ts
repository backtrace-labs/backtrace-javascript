import {
    BacktraceCoreClient,
    BacktraceCoreClientBuilder,
    BreadcrumbsManager,
    SingleSessionProvider,
    SubmissionUrlInformation,
    V8StackTraceConverter,
    VariableDebugIdMapProvider,
    type AttributeType,
    type BacktraceData,
    type BacktraceReport,
    type DebugIdContainer,
} from '@backtrace/sdk-core';
import { NativeModules, Platform } from 'react-native';
import { AnrException } from './anr/AnrException';
import { AnrReporter } from './anr/AnrReporter';
import { AnrWatchdogHandler } from './anr/AnrWatchdogHandler';
import { NativeAttributeProvider } from './attributes/NativeAttributeProvider';
import { ReactNativeAttributeProvider } from './attributes/ReactNativeAttributeProvider';
import { BacktraceAnrType, type BacktraceConfiguration } from './BacktraceConfiguration';
import { AppStateBreadcrumbSubscriber } from './breadcrumbs/events/AppStateBreadcrumbSubscriber';
import { DimensionChangeBreadcrumbSubscriber } from './breadcrumbs/events/DimensionChangeBreadcrumbSubscriber';
import { WebRequestEventSubscriber } from './breadcrumbs/events/WebRequestEventSubscriber';
import { FileBreadcrumbsStorage } from './breadcrumbs/FileBreadcrumbsStorage';
import type { BacktraceClientSetup } from './builder/BacktraceClientSetup';
import { DebuggerHelper } from './common/DebuggerHelper';
import { version } from './common/platformHelper';
import { version as agentVersion } from '../package.json';
import { CrashReporter } from './crashReporter/CrashReporter';
import { generateUnhandledExceptionHandler } from './handlers';
import { AndroidUnhandledException } from './handlers/android/AndroidUnhandledException';
import { type ExceptionHandler } from './handlers/ExceptionHandler';
import { ReactNativeRequestHandler } from './ReactNativeRequestHandler';
import { ReactStackTraceConverter } from './ReactStackTraceConverter';
import { type FileSystem } from './storage/FileSystem';
import { ReactNativeFileSystem } from './storage/ReactNativeFileSystem';

// Must match the private attribute name BreadcrumbsManager sets on JS reports.
const BREADCRUMB_ATTRIBUTE_NAME = 'breadcrumbs.lastId';
// Must match the symbolication_id query parameter of the mapping file upload.
const SYMBOLICATION_ID_ATTRIBUTE_NAME = 'symbolication_id';

export class BacktraceClient extends BacktraceCoreClient<BacktraceConfiguration> {
    private _crashReporter?: CrashReporter;
    private _anrWatchdogHandler?: AnrWatchdogHandler;
    private readonly _exceptionHandler: ExceptionHandler = generateUnhandledExceptionHandler();

    public crash(): void {
        CrashReporter.crash();
    }

    public static get applicationDataPath(): string {
        return NativeModules.BacktraceDirectoryProvider?.applicationDirectory() ?? '';
    }

    constructor(clientSetup: BacktraceClientSetup) {
        super({
            sdkOptions: {
                agent: '@backtrace/react-native',
                agentVersion: agentVersion,
                langName: 'react-native',
                langVersion: version(),
            },
            requestHandler: new ReactNativeRequestHandler(clientSetup.options),
            debugIdMapProvider: new VariableDebugIdMapProvider(global as DebugIdContainer),
            stackTraceConverter: new ReactStackTraceConverter(new V8StackTraceConverter('address at')),
            sessionProvider: new SingleSessionProvider(),
            ...clientSetup,
        });

        const fileSystem = clientSetup.fileSystem as FileSystem;
        if (!fileSystem) {
            return;
        }

        const breadcrumbsManager = this.modules.get(BreadcrumbsManager);
        if (breadcrumbsManager && this.sessionFiles) {
            breadcrumbsManager.setStorage(
                FileBreadcrumbsStorage.factory(this.sessionFiles, fileSystem, (lastBreadcrumbId) =>
                    this.refreshNativeBreadcrumbs(lastBreadcrumbId),
                ),
            );
        }

        this.attributeManager.attributeEvents.on(
            'scoped-attributes-updated',
            (reportData: { attributes: Record<string, AttributeType> }) => {
                this._crashReporter?.updateAttributes(reportData.attributes);
            },
        );

        this.attachmentManager.attachmentEvents.on('scoped-attachments-updated', () => {
            this._crashReporter?.updateAttachments(this.attachments);
        });
    }

    public initialize(): void {
        const lockId = this.sessionFiles?.lockPreviousSessions();
        try {
            super.initialize();
            this.addProguardSymbolicationId();
            this.captureUnhandledErrors(
                this.options.captureUnhandledErrors,
                this.options.captureUnhandledPromiseRejections,
            );

            this._crashReporter = this.initializeNativeCrashReporter();
            this.reportApplicationNotResponding();
        } finally {
            lockId && this.sessionFiles?.unlockPreviousSessions(lockId);
        }
    }

    public dispose(): void {
        this._exceptionHandler.dispose();
        this._anrWatchdogHandler?.dispose();
        this._crashReporter?.dispose();
        super.dispose();
    }

    public static builder(options: BacktraceConfiguration): BacktraceClientBuilder {
        return new BacktraceClientBuilder({ options });
    }
    /**
     * Initializes the client. If the client already exists, the available instance
     * will be returned and all other options will be ignored.
     * @param options client configuration
     * @param build builder
     * @returns backtrace client
     */
    public static initialize(
        options: BacktraceConfiguration,
        build?: (builder: BacktraceClientBuilder) => void,
    ): BacktraceClient {
        if (this.instance) {
            return this.instance;
        }
        const builder = this.builder(options);
        build && build(builder);
        this._instance = builder.build();
        return this._instance as BacktraceClient;
    }

    /**
     * Returns created BacktraceClient instance if the instance exists.
     * Otherwise undefined.
     */
    public static get instance(): BacktraceClient | undefined {
        return this._instance as BacktraceClient;
    }

    private captureUnhandledErrors(captureUnhandledExceptions = true, captureUnhandledRejections = true) {
        if (captureUnhandledExceptions) {
            this._exceptionHandler.captureManagedErrors(this);
        }

        if (captureUnhandledRejections) {
            this._exceptionHandler.captureUnhandledPromiseRejections(this);
        }
    }

    protected generateSubmissionData(report: BacktraceReport): BacktraceData | undefined {
        if (this.options.proguard?.enable && this.hasJavaStackTrace(report)) {
            report.symbolication = 'proguard';
        }
        return super.generateSubmissionData(report);
    }

    private hasJavaStackTrace(report: BacktraceReport): boolean {
        return report.data instanceof AndroidUnhandledException || report.data instanceof AnrException;
    }

    private addProguardSymbolicationId(): void {
        const proguard = this.options.proguard;
        if (Platform.OS !== 'android' || !proguard?.enable || !proguard.symbolicationId) {
            return;
        }
        this.addAttribute({ [SYMBOLICATION_ID_ATTRIBUTE_NAME]: proguard.symbolicationId });
    }

    private reportApplicationNotResponding(): void {
        const anr = this.options.anr;
        if (!anr?.enable) {
            return;
        }

        if (anr.type === BacktraceAnrType.ApplicationExit) {
            const fileSystem = this.fileSystem as FileSystem | undefined;
            if (!fileSystem) {
                return;
            }

            AnrReporter.create(fileSystem)?.report(this);
            return;
        }

        this._anrWatchdogHandler = AnrWatchdogHandler.create();
        this._anrWatchdogHandler?.start(this, anr.timeout ?? 0, anr.disableWhenDebuggerAttached ?? false);
    }

    private refreshNativeBreadcrumbs(lastBreadcrumbId: number) {
        if (!this._crashReporter) {
            return;
        }
        this._crashReporter.updateAttachments(this.attachments);
        this._crashReporter.updateAttributes({ [BREADCRUMB_ATTRIBUTE_NAME]: lastBreadcrumbId });
    }

    private initializeNativeCrashReporter(): CrashReporter | undefined {
        if (!this.options.database?.enable) {
            return;
        }

        if (!this.options.database?.captureNativeCrashes) {
            return;
        }

        const fileSystem = this.fileSystem;
        if (!fileSystem) {
            return;
        }

        const submissionUrl = SubmissionUrlInformation.toJsonReportSubmissionUrl(this.options.url);

        const crashReporter = new CrashReporter(fileSystem);
        crashReporter.initialize(
            Platform.select({
                ios: SubmissionUrlInformation.toPlCrashReporterSubmissionUrl(submissionUrl),
                android: SubmissionUrlInformation.toMinidumpSubmissionUrl(submissionUrl),
                default: submissionUrl,
            }),
            this.options.database.path,
            this.attributeManager.get('scoped').attributes,
            this.attachments,
        );
        return crashReporter;
    }
}

/**
 * Builder for {@link BacktraceClient}; obtain one with `BacktraceClient.builder(options)`.
 */
// Implementation note:
// defined in the same module as `BacktraceClient` on purpose. `BacktraceClient.builder()` creates the builder and `BacktraceClientBuilder.build()` creates the client, splitting them into two modules creates a circular import.
// The browser and node packages keep that cycle harmlessly because rollup bundles them into a single scope;
// this package ships per-file modules to Metro, and Metro's import/export transform (`experimentalImportSupport`) captures imported bindings when a module is evaluated, which leaves one side of the cycle `undefined`.
export class BacktraceClientBuilder extends BacktraceCoreClientBuilder<BacktraceClientSetup> {
    constructor(clientSetup: BacktraceClientSetup) {
        super(clientSetup);

        this.addAttributeProvider(new ReactNativeAttributeProvider());
        if (!DebuggerHelper.isNativeBridgeEnabled()) {
            return;
        }

        if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
            return;
        }

        const attributeProviders = Platform.select({
            ios: [
                new NativeAttributeProvider('BacktraceApplicationAttributeProvider', 'scoped'),
                new NativeAttributeProvider('BacktraceDeviceAttributeProvider', 'scoped'),
                new NativeAttributeProvider('BacktraceSystemAttributeProvider', 'scoped'),
                new NativeAttributeProvider('BacktraceMemoryUsageAttributeProvider', 'dynamic'),
                new NativeAttributeProvider('BacktraceCpuAttributeProvider', 'dynamic'),
            ],
            android: [
                new NativeAttributeProvider('BacktraceApplicationAttributeProvider', 'scoped'),
                new NativeAttributeProvider('BacktraceDeviceAttributeProvider', 'scoped'),
                new NativeAttributeProvider('BacktraceSystemAttributeProvider', 'scoped'),
                new NativeAttributeProvider('MemoryInformationAttributeProvider', 'dynamic'),
                new NativeAttributeProvider('ProcessAttributeProvider', 'dynamic'),
            ],
            default: [],
        });

        for (const provider of attributeProviders) {
            this.addAttributeProvider(provider);
        }

        this.useFileSystem(new ReactNativeFileSystem());
        this.useBreadcrumbSubscriber(new AppStateBreadcrumbSubscriber());
        this.useBreadcrumbSubscriber(new DimensionChangeBreadcrumbSubscriber());
        this.useBreadcrumbSubscriber(new WebRequestEventSubscriber());
    }

    public useFileSystem(fileSystem: ReactNativeFileSystem): this {
        super.useFileSystem(fileSystem);
        return this;
    }

    public build(): BacktraceClient {
        const instance = new BacktraceClient(this.clientSetup);
        instance.initialize();
        return instance;
    }
}
