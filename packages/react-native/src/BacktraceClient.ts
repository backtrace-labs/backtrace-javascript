import { BacktraceBrowserRequestHandler, ReactStackTraceConverter } from '@backtrace-labs/react';
import {
    BacktraceCoreClient,
    SingleSessionProvider,
    SubmissionUrlInformation,
    V8StackTraceConverter,
    VariableDebugIdMapProvider,
    type AttributeType,
    type DebugIdContainer,
} from '@backtrace-labs/sdk-core';
import { Platform } from 'react-native';
import { type BacktraceConfiguration } from './BacktraceConfiguration';
import { BacktraceClientBuilder } from './builder/BacktraceClientBuilder';
import type { BacktraceClientSetup } from './builder/BacktraceClientSetup';
import { version } from './common/platformHelper';
import { CrashReporter } from './crashReporter/CrashReporter';
import { generateUnhandledExceptionHandler } from './handlers';
import { type ExceptionHandler } from './handlers/ExceptionHandler';

export class BacktraceClient extends BacktraceCoreClient<BacktraceConfiguration> {
    private readonly crashReporter: CrashReporter = new CrashReporter();
    private readonly _exceptionHandler: ExceptionHandler = generateUnhandledExceptionHandler();

    public crash(): void {
        this.crashReporter.crash();
    }
    constructor(clientSetup: BacktraceClientSetup) {
        super({
            sdkOptions: {
                agent: '@backtrace/react-native',
                agentVersion: '0.0.1',
                langName: 'react-native',
                langVersion: version(),
            },
            requestHandler: new BacktraceBrowserRequestHandler(clientSetup.options),
            debugIdMapProvider: new VariableDebugIdMapProvider(global as DebugIdContainer),
            stackTraceConverter: new ReactStackTraceConverter(new V8StackTraceConverter()),
            sessionProvider: new SingleSessionProvider(),
            ...clientSetup,
        });

        this.captureUnhandledErrors(
            clientSetup.options.captureUnhandledErrors,
            clientSetup.options.captureUnhandledPromiseRejections,
        );
        const submissionUrl = SubmissionUrlInformation.toJsonReportSubmissionUrl(clientSetup.options.url);

        this.crashReporter.initialize(
            Platform.select({
                ios: SubmissionUrlInformation.toPlCrashReporterSubmissionUrl(submissionUrl),
                android: SubmissionUrlInformation.toMinidumpSubmissionUrl(submissionUrl),
                default: submissionUrl,
            }),
            this.attributeManager.get('scoped').attributes,
            this.attachments,
        );
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
        this.crashReporter?.updateAttributes(
            Object.fromEntries(
                Object.entries(attributes)
                    .filter(([key]) => clientAttributes[key] != null)
                    .map((n) => n as [string, AttributeType]),
            ),
        );
    }

    public dispose(): void {
        this._exceptionHandler.dispose();
        this.crashReporter.dispose();
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
}
