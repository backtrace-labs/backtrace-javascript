import {
    BacktraceAttributeProvider,
    BacktraceConfiguration as CoreConfiguration,
    BacktraceCoreClient,
    BacktraceReport,
    BacktraceRequestHandler,
    DebugIdContainer,
    VariableDebugIdMapProvider,
} from '@backtrace/sdk-core';
import { AGENT } from './agentDefinition';
import { BacktraceConfiguration } from './BacktraceConfiguration';
import { BacktraceClientBuilder } from './builder/BacktraceClientBuilder';
import { StrictModeDetector } from './common/StrictModeDetector';

export class BacktraceClient extends BacktraceCoreClient {
    constructor(
        options: CoreConfiguration,
        handler: BacktraceRequestHandler,
        attributeProviders: BacktraceAttributeProvider[],
    ) {
        super(
            options,
            AGENT,
            handler,
            attributeProviders,
            undefined,
            undefined,
            new VariableDebugIdMapProvider(global as DebugIdContainer),
        );
        this.captureUnhandledErrors();
    }

    public static builder(options: BacktraceConfiguration): BacktraceClientBuilder {
        return new BacktraceClientBuilder(options);
    }

    private captureUnhandledErrors() {
        const isStrictModeEnabled = StrictModeDetector.enabled();

        process.prependListener(
            'uncaughtExceptionMonitor',
            async (error: Error, origin?: 'uncaughtException' | 'unhandledRejection') => {
                // all rejected promises will be captured via different handler
                if (origin === 'unhandledRejection') {
                    return;
                }
                await this.send(new BacktraceReport(error, { 'error.type': 'Unhandled exception' }));
            },
        );

        process.prependListener('unhandledRejection', async (reason) => {
            const error =
                reason instanceof Error
                    ? reason
                    : typeof reason === 'string'
                    ? new Error(reason)
                    : new Error('Unhandled rejection');
            await this.send(
                new BacktraceReport(error, {
                    'error.type': 'Unhandled exception',
                }),
            );

            if (isStrictModeEnabled) {
                console.error(reason);
                process.exit(1);
            }
        });
    }
}
