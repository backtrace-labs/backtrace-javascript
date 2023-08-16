import {
    BacktraceAttributeProvider,
    BacktraceCoreClient,
    BacktraceReport,
    BacktraceRequestHandler,
    BacktraceStackTraceConverter,
    BreadcrumbsEventSubscriber,
    DebugIdContainer,
    VariableDebugIdMapProvider,
} from '@backtrace/sdk-core';
import { AGENT } from './agentDefinition';
import { BacktraceBrowserSessionProvider } from './BacktraceBrowserSessionProvider';
import { BacktraceConfiguration } from './BacktraceConfiguration';
import { BacktraceClientBuilder } from './builder/BacktraceClientBuilder';

export class BacktraceClient extends BacktraceCoreClient {
    protected static _instance?: BacktraceClient;
    constructor(
        options: BacktraceConfiguration,
        handler: BacktraceRequestHandler,
        attributeProviders: BacktraceAttributeProvider[],
        stackTraceConverter: BacktraceStackTraceConverter,
        breadcrumbsEventSubscriber: BreadcrumbsEventSubscriber[],
    ) {
        super(
            options,
            AGENT,
            handler,
            attributeProviders,
            stackTraceConverter,
            new BacktraceBrowserSessionProvider(),
            new VariableDebugIdMapProvider(window as DebugIdContainer),
            {
                subscribers: breadcrumbsEventSubscriber,
            },
        );

        this.captureUnhandledErrors(options.captureUnhandledErrors, options.captureUnhandledPromiseRejections);
    }

    public static builder(options: BacktraceConfiguration): BacktraceClientBuilder {
        return new BacktraceClientBuilder(options);
    }

    public static initialize(
        options: BacktraceConfiguration,
        build?: (builder: BacktraceClientBuilder) => void,
    ): BacktraceClient {
        if (this._instance) {
            return this._instance;
        }
        const builder = this.builder(options);
        build && build(builder);
        this._instance = builder.build().initialize();
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
                    new BacktraceReport(errorEvent.reason, {
                        'error.type': 'Unhandled exception',
                    }),
                );
            });
        }
    }
}
