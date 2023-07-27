import {
    BacktraceAttributeProvider,
    BacktraceCoreClient,
    BacktraceReport,
    BacktraceRequestHandler,
    BacktraceStackTraceConverter,
    DebugIdContainer,
    VariableDebugIdMapProvider,
} from '@backtrace/sdk-core';
import { AGENT } from './agentDefinition';
import { BacktraceBrowserSessionProvider } from './BacktraceBrowserSessionProvider';
import { BacktraceConfiguration } from './BacktraceConfiguration';
import { BacktraceClientBuilder } from './builder/BacktraceClientBuilder';

export class BacktraceClient extends BacktraceCoreClient {
    constructor(
        options: BacktraceConfiguration,
        handler: BacktraceRequestHandler,
        attributeProviders: BacktraceAttributeProvider[],
        stackTraceConverter: BacktraceStackTraceConverter,
    ) {
        super(
            options,
            AGENT,
            handler,
            attributeProviders,
            stackTraceConverter,
            new BacktraceBrowserSessionProvider(),
            new VariableDebugIdMapProvider(window as DebugIdContainer),
        );

        this.captureUnhandledErrors(options.captureUnhandledErrors, options.captureUnhandledPromiseRejections);
    }

    public static builder(options: BacktraceConfiguration): BacktraceClientBuilder {
        return new BacktraceClientBuilder(options);
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
