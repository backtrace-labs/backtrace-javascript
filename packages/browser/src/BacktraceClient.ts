import {
    BacktraceCoreClient,
    BacktraceReport,
    DebugIdContainer,
    VariableDebugIdMapProvider,
} from '@backtrace/sdk-core';
import { AGENT } from './agentDefinition.js';
import { BacktraceBrowserRequestHandler } from './BacktraceBrowserRequestHandler.js';
import { BacktraceBrowserSessionProvider } from './BacktraceBrowserSessionProvider.js';
import { BacktraceConfiguration } from './BacktraceConfiguration.js';
import { BacktraceClientBuilder } from './builder/BacktraceClientBuilder.js';
import { BacktraceClientSetup } from './builder/BacktraceClientSetup.js';
import { getStackTraceConverter } from './converters/getStackTraceConverter.js';

export class BacktraceClient<O extends BacktraceConfiguration = BacktraceConfiguration> extends BacktraceCoreClient<O> {
    private readonly _disposeController: AbortController = new AbortController();

    constructor(clientSetup: BacktraceClientSetup<O>) {
        super({
            sdkOptions: AGENT,
            stackTraceConverter: getStackTraceConverter(),
            requestHandler: new BacktraceBrowserRequestHandler(clientSetup.options),
            debugIdMapProvider: new VariableDebugIdMapProvider(window as DebugIdContainer),
            sessionProvider: new BacktraceBrowserSessionProvider(),
            ...clientSetup,
        });

        this.captureUnhandledErrors(
            clientSetup.options.captureUnhandledErrors,
            clientSetup.options.captureUnhandledPromiseRejections,
        );
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

    /**
     * Disposes the client and all client callbacks
     */
    public dispose(): void {
        this._disposeController.abort();
        super.dispose();
        BacktraceClient._instance = undefined;
    }

    private captureUnhandledErrors(captureUnhandledExceptions = true, captureUnhandledRejections = true) {
        if (captureUnhandledExceptions) {
            window.addEventListener(
                'error',
                (errorEvent: ErrorEvent) => {
                    this.send(
                        new BacktraceReport(errorEvent.error ?? errorEvent.message, {
                            'error.type': 'Unhandled exception',
                        }),
                    );
                },
                {
                    signal: this._disposeController.signal,
                },
            );
        }

        if (captureUnhandledRejections) {
            window.addEventListener(
                'unhandledrejection',
                (errorEvent: PromiseRejectionEvent) => {
                    this.send(
                        new BacktraceReport(
                            errorEvent.reason,
                            {
                                'error.type': 'Unhandled exception',
                            },
                            [],
                            {
                                classifiers: ['UnhandledPromiseRejection'],
                            },
                        ),
                    );
                },
                {
                    signal: this._disposeController.signal,
                },
            );
        }
    }
}
