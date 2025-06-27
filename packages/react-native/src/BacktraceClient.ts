import {
    BacktraceCoreClient,
    BreadcrumbsManager,
    SingleSessionProvider,
    SubmissionUrlInformation,
    V8StackTraceConverter,
    VariableDebugIdMapProvider,
    type AttributeType,
    type DebugIdContainer,
} from '@backtrace/sdk-core';
import { NativeModules, Platform } from 'react-native';
import { type BacktraceConfiguration } from './BacktraceConfiguration';
import { FileBreadcrumbsStorage } from './breadcrumbs/FileBreadcrumbsStorage';
import { BacktraceClientBuilder } from './builder/BacktraceClientBuilder';
import type { BacktraceClientSetup } from './builder/BacktraceClientSetup';
import { version } from './common/platformHelper';
import { CrashReporter } from './crashReporter/CrashReporter';
import { assertDatabasePath } from './database/utils';
import { generateUnhandledExceptionHandler } from './handlers';
import { type ExceptionHandler } from './handlers/ExceptionHandler';
import { ReactNativeRequestHandler } from './ReactNativeRequestHandler';
import { ReactStackTraceConverter } from './ReactStackTraceConverter';
import { ReactNativePathBacktraceStorageFactory, type BacktraceStorageModule } from './storage';

export class BacktraceClient extends BacktraceCoreClient<BacktraceConfiguration> {
    private readonly _crashReporter?: CrashReporter;
    private readonly _exceptionHandler: ExceptionHandler = generateUnhandledExceptionHandler();

    public crash(): void {
        CrashReporter.crash();
    }

    public static get applicationDataPath(): string {
        return NativeModules.BacktraceDirectoryProvider?.applicationDirectory() ?? '';
    }

    protected get databaseRnStorage() {
        return this.databaseStorage as BacktraceStorageModule | undefined;
    }

    constructor(clientSetup: BacktraceClientSetup) {
        const storageFactory = clientSetup.storageFactory ?? new ReactNativePathBacktraceStorageFactory();
        const storage =
            clientSetup.database?.storage ??
            (clientSetup.options.database?.enable
                ? storageFactory.create({
                      path: assertDatabasePath(clientSetup.options.database?.path),
                      createDirectory: clientSetup.options.database.createDatabaseDirectory,
                  })
                : undefined);

        super({
            sdkOptions: {
                agent: '@backtrace/react-native',
                agentVersion: '0.0.1',
                langName: 'react-native',
                langVersion: version(),
            },
            requestHandler: new ReactNativeRequestHandler(clientSetup.options),
            debugIdMapProvider: new VariableDebugIdMapProvider(global as DebugIdContainer),
            stackTraceConverter: new ReactStackTraceConverter(new V8StackTraceConverter('address at')),
            sessionProvider: new SingleSessionProvider(),
            ...clientSetup,
        });

        const breadcrumbsManager = this.modules.get(BreadcrumbsManager);
        if (breadcrumbsManager && this.sessionFiles && storage) {
            breadcrumbsManager.setStorage(FileBreadcrumbsStorage.factory(this.sessionFiles, storage));
        }

        this.attributeManager.attributeEvents.on(
            'scoped-attributes-updated',
            (reportData: { attributes: Record<string, AttributeType> }) => {
                this._crashReporter?.updateAttributes(reportData.attributes);
            },
        );
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
        } finally {
            lockId && this.sessionFiles?.unlockPreviousSessions(lockId);
        }
    }

    public dispose(): void {
        this._exceptionHandler.dispose();
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

    private initializeNativeCrashReporter(): CrashReporter | undefined {
        if (!this.options.database?.enable) {
            return;
        }

        if (!this.options.database?.captureNativeCrashes) {
            return;
        }

        const storage = this.databaseRnStorage;
        if (!storage) {
            return;
        }

        const submissionUrl = SubmissionUrlInformation.toJsonReportSubmissionUrl(this.options.url);

        const crashReporter = new CrashReporter(storage);
        crashReporter.initialize(
            Platform.select({
                ios: SubmissionUrlInformation.toPlCrashReporterSubmissionUrl(submissionUrl),
                android: SubmissionUrlInformation.toMinidumpSubmissionUrl(submissionUrl),
                default: submissionUrl,
            }),
            this.attributeManager.get('scoped').attributes,
            this.attachments,
        );
        return crashReporter;
    }
}
