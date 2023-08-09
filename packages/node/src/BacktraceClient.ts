import {
    BacktraceAttributeProvider,
    BacktraceCoreClient,
    BacktraceReport,
    BacktraceRequestHandler,
    BacktraceConfiguration as CoreConfiguration,
    DebugIdContainer,
    VariableDebugIdMapProvider,
} from '@backtrace/sdk-core';
import { BacktraceConfiguration } from './BacktraceConfiguration';
import { AGENT } from './agentDefinition';
import { BacktraceClientBuilder } from './builder/BacktraceClientBuilder';
import { NodeOptionReader } from './common/NodeOptionReader';
import { BacktraceDatabaseFileStorageProvider } from './database/BacktraceDatabaseFileStorageProvider';

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
            undefined,
            BacktraceDatabaseFileStorageProvider.createIfValid(options.database),
        );
    }

    public initialize() {
        super.initialize();

        this.captureUnhandledErrors(
            this.options.captureUnhandledErrors,
            this.options.captureUnhandledPromiseRejections,
        );

        return this;
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
        if (!captureUnhandledExceptions && !captureUnhandledRejections) {
            return;
        }

        const captureUncaughtException = async (error: Error, origin?: 'uncaughtException' | 'unhandledRejection') => {
            if (origin === 'unhandledRejection' && !captureUnhandledRejections) {
                return;
            }
            if (origin === 'uncaughtException' && !captureUnhandledExceptions) {
                return;
            }
            await this.send(new BacktraceReport(error, { 'error.type': 'Unhandled exception', errorOrigin: origin }));
        };

        process.prependListener('uncaughtExceptionMonitor', captureUncaughtException);

        if (!captureUnhandledRejections) {
            return;
        }

        // Node 15+ has changed the default unhandled promise rejection behavior.
        // In node 14 - the default behavior is to warn about unhandled promise rejections. In newer version
        // the default mode is throw.
        const nodeMajorVersion = process.version.split('.')[0];
        const unhandledRejectionMode = NodeOptionReader.read('unhandled-rejections');
        const traceWarnings = NodeOptionReader.read('trace-warnings');

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

        const captureUnhandledRejectionsCallback = async (reason: unknown) => {
            const isErrorTypeReason = reason instanceof Error;
            const error = isErrorTypeReason ? reason : new Error(reason?.toString() ?? 'Unhandled rejection');
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

            // everything else will be handled by node
            if (unhandledRejectionMode === 'none' || unhandledRejectionMode === 'warn') {
                return;
            }

            // handle last status: warn-with-error-code
            process.exitCode = 1;
            const unhandledRejectionErrName = 'UnhandledPromiseRejectionWarning';

            process.emitWarning(
                (isErrorTypeReason ? error.stack : reason?.toString()) ?? '',
                unhandledRejectionErrName,
            );

            const warning = new Error(
                `Unhandled promise rejection. This error originated either by ` +
                    `throwing inside of an async function without a catch block, ` +
                    `or by rejecting a promise which was not handled with .catch(). ` +
                    `To terminate the node process on unhandled promise ` +
                    'rejection, use the CLI flag `--unhandled-rejections=strict` (see ' +
                    'https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode). ',
            );
            Object.defineProperty(warning, 'name', {
                value: 'UnhandledPromiseRejectionWarning',
                enumerable: false,
                writable: true,
                configurable: true,
            });
            warning.stack = traceWarnings && isErrorTypeReason ? error.stack ?? '' : '';
            process.emitWarning(warning);
        };
        process.prependListener('unhandledRejection', captureUnhandledRejectionsCallback);
    }
}
