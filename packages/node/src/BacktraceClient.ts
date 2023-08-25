import {
    BacktraceAttributeProvider,
    BacktraceConfiguration as CoreConfiguration,
    BacktraceCoreClient,
    BacktraceReport,
    BacktraceRequestHandler,
    BreadcrumbsEventSubscriber,
    DebugIdContainer,
    VariableDebugIdMapProvider,
} from '@backtrace-labs/sdk-core';
import fs from 'fs';
import * as fsPromise from 'fs/promises';
import path from 'path';
import { AGENT } from './agentDefinition';
import { BacktraceConfiguration } from './BacktraceConfiguration';
import { BacktraceClientBuilder } from './builder/BacktraceClientBuilder';
import { NodeOptionReader } from './common/NodeOptionReader';
import { NodeDiagnosticReportConverter } from './converter/NodeDiagnosticReportConverter';
import { BacktraceDatabaseFileStorageProvider } from './database/BacktraceDatabaseFileStorageProvider';

export class BacktraceClient extends BacktraceCoreClient {
    private static _instance?: BacktraceClient;
    constructor(
        options: CoreConfiguration,
        handler: BacktraceRequestHandler,
        attributeProviders: BacktraceAttributeProvider[],
        breadcrumbsEventSubscribers: BreadcrumbsEventSubscriber[],
    ) {
        super(
            options,
            AGENT,
            handler,
            attributeProviders,
            undefined,
            undefined,
            new VariableDebugIdMapProvider(global as DebugIdContainer),
            {
                subscribers: breadcrumbsEventSubscribers,
            },
            BacktraceDatabaseFileStorageProvider.createIfValid(options.database),
        );
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
    public static initialize(options: BacktraceConfiguration, build?: (builder: BacktraceClientBuilder) => void) {
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

    protected initialize() {
        super.initialize();

        this.loadNodeCrashes();

        this.captureUnhandledErrors(
            this.options.captureUnhandledErrors,
            this.options.captureUnhandledPromiseRejections,
        );

        this.captureNodeCrashes();

        return this;
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
            await this.send(
                new BacktraceReport(error, { 'error.type': 'Unhandled exception', errorOrigin: origin }, [], {
                    classifiers: origin === 'unhandledRejection' ? ['UnhandledPromiseRejection'] : undefined,
                }),
            );
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
            await this.send(
                new BacktraceReport(
                    isErrorTypeReason ? reason : reason?.toString() ?? 'Unhandled rejection',
                    {
                        'error.type': 'Unhandled exception',
                    },
                    [],
                    {
                        classifiers: ['UnhandledPromiseRejection'],
                        skipFrames: isErrorTypeReason ? 0 : 1,
                    },
                ),
            );
            const error = isErrorTypeReason ? reason : new Error(reason?.toString() ?? 'Unhandled rejection');

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

    private captureNodeCrashes() {
        if (!process.report) {
            return;
        }

        if (!this.options.database?.enable) {
            return;
        }

        if (!this.options.database?.captureNativeCrashes) {
            return;
        }

        process.report.reportOnFatalError = true;
        if (!process.report.directory) {
            process.report.directory = this.options.database.path;
        }
    }

    private async loadNodeCrashes() {
        if (!this.options.database?.captureNativeCrashes) {
            return;
        }

        const reportName = process.report?.filename;
        const databasePath = process.report?.directory
            ? process.report.directory
            : this.options.database?.path ?? process.cwd();

        const databaseFiles = fs.readdirSync(databasePath, {
            encoding: 'utf8',
            withFileTypes: true,
        });

        const converter = new NodeDiagnosticReportConverter();

        const recordNames = databaseFiles
            .filter(
                (file) =>
                    file.isFile() &&
                    // If the user specifies a preset name for reports, we should compare it directly
                    // Otherwise, match the default name
                    (reportName
                        ? file.name === reportName
                        : file.name.startsWith('report.') && file.name.endsWith('.json')),
            )
            .map((n) => n.name);

        for (const recordName of recordNames) {
            const recordPath = path.join(databasePath, recordName);
            try {
                const recordJson = await fsPromise.readFile(recordPath, 'utf8');
                const data = converter.convert(JSON.parse(recordJson));
                await this.send(data);
            } catch {
                // Do nothing, skip the report
            } finally {
                await fsPromise.unlink(recordPath);
            }
        }
    }
}
