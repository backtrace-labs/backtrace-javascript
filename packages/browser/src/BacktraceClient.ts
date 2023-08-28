import {
    BacktraceAttributeProvider,
    BacktraceCoreClient,
    BacktraceReport,
    BacktraceRequestHandler,
    BacktraceSessionProvider,
    BacktraceStackTraceConverter,
    BreadcrumbsEventSubscriber,
    DebugIdContainer,
    VariableDebugIdMapProvider,
} from '@backtrace-labs/sdk-core';
import { AGENT } from './agentDefinition';
import { BacktraceBrowserSessionProvider } from './BacktraceBrowserSessionProvider';
import { BacktraceConfiguration } from './BacktraceConfiguration';
import { BacktraceClientBuilder } from './builder/BacktraceClientBuilder';

export class BacktraceClient extends BacktraceCoreClient {
    protected static _instance?: BacktraceClient;
    constructor(
        options: BacktraceConfiguration,
        requestHandler: BacktraceRequestHandler,
        attributeProviders: BacktraceAttributeProvider[],
        stackTraceConverter: BacktraceStackTraceConverter,
        breadcrumbsEventSubscriber: BreadcrumbsEventSubscriber[],
        sessionProvider: BacktraceSessionProvider = new BacktraceBrowserSessionProvider(),
    ) {
        super({
            options,
            sdkOptions: AGENT,
            requestHandler,
            attributeProviders,
            stackTraceConverter,
            sessionProvider,
            debugIdMapProvider: new VariableDebugIdMapProvider(window as DebugIdContainer),
            breadcrumbsSetup: {
                subscribers: breadcrumbsEventSubscriber,
            },
        });

        this.captureUnhandledErrors(options.captureUnhandledErrors, options.captureUnhandledPromiseRejections);
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
        if (this._instance) {
            return this._instance;
        }
        const builder = this.builder(options);
        build && build(builder);
        this._instance = builder.build();
        return this._instance;
    }

    /**
     * Returns created BacktraceClient instance if the instance exists.
     * Otherwise undefined.
     */
    public static get instance(): BacktraceClient | undefined {
        return this._instance;
    }

    private captureUnhandledErrors(captureUnhandledExceptions = true, captureUnhandledRejections = true) {
        if (captureUnhandledExceptions) {
            window.addEventListener('error', async (errorEvent: ErrorEvent) => {
                await this.send(
                    new BacktraceReport(errorEvent.error, {
                        'error.type': 'Unhandled exception',
                    }),
                );
            });
        }

        if (captureUnhandledRejections) {
            window.addEventListener('unhandledrejection', async (errorEvent: PromiseRejectionEvent) => {
                await this.send(
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
            });
        }
    }
}
