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
import { NodeOptionReader } from './common/NodeOptionReader';

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
        if (options.captureUnhandledErrors !== false) {
            this.captureUnhandledErrors();
        }
    }

    public static builder(options: BacktraceConfiguration): BacktraceClientBuilder {
        return new BacktraceClientBuilder(options);
    }

    private captureUnhandledErrors() {
        process.prependListener(
            'uncaughtExceptionMonitor',
            async (error: Error, origin?: 'uncaughtException' | 'unhandledRejection') => {
                await this.send(
                    new BacktraceReport(error, { 'error.type': 'Unhandled exception', errorOrigin: origin }),
                );
            },
        );

        // Node 15+ has changed the default unhandled promise rejection behavior.
        // In node 14 - the default behavior is to warn about unhandled promise rejections. In newer version
        // the default mode is throw.
        const nodeMajorVersion = process.version.split('.')[0];
        const unhandledRejectionMode = NodeOptionReader.read('unhandled-rejections');

        /**
         * Node JS allows to use only uncaughtExceptionMonitor only when:
         * - we're in the throw/strict error mode
         * - the node version 15+
         *
         * In other scenarios we need to capture unhandledRejections via other event.
         */
        const ignoreUnhandledRejectionHandler =
            unhandledRejectionMode === 'strict' ||
            unhandledRejectionMode === 'throw' ||
            (nodeMajorVersion !== 'v14' && !unhandledRejectionMode);

        if (ignoreUnhandledRejectionHandler) {
            return;
        }
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

            // if there is any other unhandled rejection handler, reproduce default node behavior
            // and let other handlers to capture the event
            if (process.listenerCount('unhandledRejection') !== 1) {
                return;
            }

            if (unhandledRejectionMode === 'none') {
                return;
            }

            if (unhandledRejectionMode === 'warn-with-error-code') {
                process.exitCode = 1;
            }
            process.emitWarning(
                `UnhandledPromiseRejectionWarning: ${error.message} \n ${error.stack ?? ''}` +
                    '\n' +
                    `Unhandled promise rejection. This error originated either by ` +
                    `throwing inside of an async function without a catch block, ` +
                    `or by rejecting a promise which was not handled with .catch().` +
                    `To terminate the node process on unhandled promise ` +
                    'rejection, use the CLI flag `--unhandled-rejections=strict` (see ' +
                    'https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode). ',
            );
        });
    }
}
