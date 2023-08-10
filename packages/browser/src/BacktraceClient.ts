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
import { BacktraceBrowserSessionProvider } from './BacktraceBrowserSessionProvider';
import { BacktraceConfiguration } from './BacktraceConfiguration';
import { AGENT } from './agentDefinition';
import { BacktraceClientBuilder } from './builder/BacktraceClientBuilder';

export class BacktraceClient extends BacktraceCoreClient {
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

    public static initialize(options: BacktraceConfiguration, build?: (builder: BacktraceClientBuilder) => void) {
        const builder = this.builder(options);
        build && build(builder);
        return builder.build().initialize();
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
