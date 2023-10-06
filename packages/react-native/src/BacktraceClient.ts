import { ReactStackTraceConverter } from '@backtrace-labs/react';
import {
    BacktraceCoreClient,
    BreadcrumbsManager,
    SingleSessionProvider,
    SubmissionUrlInformation,
    V8StackTraceConverter,
    VariableDebugIdMapProvider,
    type AttributeType,
    type BacktraceAttributeProvider,
    type BacktraceRequestHandler,
    type BreadcrumbsEventSubscriber,
    type DebugIdContainer,
} from '@backtrace-labs/sdk-core';
import { NativeModules, Platform } from 'react-native';
import { BacktraceClientBuilder } from './BacktraceClientBuilder';
import { type BacktraceConfiguration } from './BacktraceConfiguration';
import { FileBreadcrumbsStorage } from './breadcrumbs/FileBreadcrumbsStorage';
import { version } from './common/platformHelper';
import { CrashReporter } from './crashReporter/CrashReporter';
import { generateUnhandledExceptionHandler } from './handlers';
import { type ExceptionHandler } from './handlers/ExceptionHandler';
import { ReactNativeFileSystem } from './storage/ReactNativeFileSystem';
export class BacktraceClient extends BacktraceCoreClient {
    private readonly _crashReporter?: CrashReporter;
    private readonly _exceptionHandler: ExceptionHandler = generateUnhandledExceptionHandler();

    public crash(): void {
        CrashReporter.crash();
    }

    public static get applicationDataPath(): string {
        return NativeModules.BacktraceDirectoryProvider?.applicationDirectory() ?? '';
    }

    constructor(
        options: BacktraceConfiguration,
        requestHandler: BacktraceRequestHandler,
        attributeProviders: BacktraceAttributeProvider[],
        breadcrumbsEventSubscribers: BreadcrumbsEventSubscriber[],
        fileSystem?: ReactNativeFileSystem,
    ) {
        super({
            options,
            sdkOptions: {
                agent: '@backtrace/react-native',
                agentVersion: '0.0.1',
                langName: 'react-native',
                langVersion: version(),
            },
            requestHandler,
            attributeProviders,
            debugIdMapProvider: new VariableDebugIdMapProvider(global as DebugIdContainer),
            breadcrumbsSetup: {
                subscribers: breadcrumbsEventSubscribers,
            },
            stackTraceConverter: new ReactStackTraceConverter(new V8StackTraceConverter()),
            sessionProvider: new SingleSessionProvider(),
            fileSystem,
        });
        if (!fileSystem) {
            return;
        }

        const breadcrumbsManager = this.modules.get(BreadcrumbsManager);
        if (breadcrumbsManager && this.sessionFiles) {
            breadcrumbsManager.setStorage(
                FileBreadcrumbsStorage.create(
                    fileSystem,
                    this.sessionFiles,
                    options.breadcrumbs?.maximumBreadcrumbs ?? 100,
                ),
            );
        }
    }

    public initialize(): void {
        const lockId = this.sessionFiles?.lockPreviousSessions();
        try {
            super.initialize();
            this.captureUnhandledErrors(
                this.options.captureUnhandledErrors,
                this.options.captureUnhandledPromiseRejections,
            );

            this.initializeNativeCrashReporter();
        } catch (err) {
            lockId && this.sessionFiles?.unlockPreviousSessions(lockId);
            throw err;
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
        super.addAttribute(attributes as Record<string, unknown>);
        if (typeof attributes === 'function') {
            return;
        }

        const clientAttributes = super.attributes;
        this._crashReporter?.updateAttributes(
            Object.fromEntries(
                Object.entries(attributes)
                    .filter(([key]) => clientAttributes[key] != null)
                    .map((n) => n as [string, AttributeType]),
            ),
        );
    }

    public dispose(): void {
        this._exceptionHandler.dispose();
        this._crashReporter?.dispose();
        super.dispose();
    }

    public static builder(options: BacktraceConfiguration): BacktraceClientBuilder {
        return new BacktraceClientBuilder(options);
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
