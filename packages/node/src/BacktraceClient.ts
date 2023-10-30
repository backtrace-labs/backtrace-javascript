import {
    BacktraceCoreClient,
    BacktraceReport,
    BreadcrumbsManager,
    DebugIdContainer,
    FileAttributeManager,
    SessionFiles,
    VariableDebugIdMapProvider,
} from '@backtrace/sdk-core';
import path from 'path';
import { AGENT } from './agentDefinition';
import { transformAttachment } from './attachment/transformAttachments';
import { BacktraceConfiguration, BacktraceSetupConfiguration } from './BacktraceConfiguration';
import { BacktraceNodeRequestHandler } from './BacktraceNodeRequestHandler';
import { FileBreadcrumbsStorage } from './breadcrumbs/FileBreadcrumbsStorage';
import { BacktraceClientBuilder } from './builder/BacktraceClientBuilder';
import { BacktraceNodeClientSetup } from './builder/BacktraceClientSetup';
import { NodeOptionReader } from './common/NodeOptionReader';
import { NodeDiagnosticReportConverter } from './converter/NodeDiagnosticReportConverter';

export class BacktraceClient extends BacktraceCoreClient<BacktraceConfiguration> {
    private _listeners: Record<string, NodeJS.UnhandledRejectionListener | NodeJS.UncaughtExceptionListener> = {};

    constructor(clientSetup: BacktraceNodeClientSetup) {
        super({
            sdkOptions: AGENT,
            requestHandler: new BacktraceNodeRequestHandler(clientSetup.options),
            debugIdMapProvider: new VariableDebugIdMapProvider(global as DebugIdContainer),
            ...clientSetup,
            options: {
                ...clientSetup.options,
                attachments: clientSetup.options.attachments?.map(transformAttachment),
            },
        });

        const breadcrumbsManager = this.modules.get(BreadcrumbsManager);
        if (breadcrumbsManager && this.sessionFiles) {
            breadcrumbsManager.setStorage(
                FileBreadcrumbsStorage.create(
                    this.sessionFiles,
                    clientSetup.options.breadcrumbs?.maximumBreadcrumbs ?? 100,
                ),
            );
        }

        if (this.sessionFiles && this.fileSystem && clientSetup.options.database?.captureNativeCrashes) {
            this.addModule(FileAttributeManager, FileAttributeManager.create(this.fileSystem));
        }
    }

    public initialize(): void {
        const lockId = this.sessionFiles?.lockPreviousSessions();

        try {
            super.initialize();
            this.captureUnhandledErrors(
                this.options.captureUnhandledErrors,
                this.options.captureUnhandledPromiseRejections,
            );

            this.captureNodeCrashes();
        } catch (err) {
            lockId && this.sessionFiles?.unlockPreviousSessions(lockId);
            throw err;
        }

        this.loadNodeCrashes().finally(() => lockId && this.sessionFiles?.unlockPreviousSessions(lockId));
    }

    public static builder(options: BacktraceSetupConfiguration): BacktraceClientBuilder {
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
        options: BacktraceSetupConfiguration,
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
        for (const [name, listener] of Object.entries(this._listeners)) {
            process.removeListener(name, listener);
        }

        super.dispose();
        BacktraceClient._instance = undefined;
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
        this._listeners['uncaughtExceptionMonitor'] = captureUncaughtException;
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
        this._listeners['unhandledRejection'] = captureUnhandledRejectionsCallback;
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
        if (!this.database || !this.fileSystem || !this.options.database?.captureNativeCrashes) {
            return;
        }

        const reportName = process.report?.filename;
        const databasePath = process.report?.directory
            ? process.report.directory
            : this.options.database?.path ?? process.cwd();

        let databaseFiles: string[];
        try {
            databaseFiles = await this.fileSystem.readDir(databasePath);
        } catch {
            return;
        }

        const converter = new NodeDiagnosticReportConverter();
        const recordNames = databaseFiles.filter((file) =>
            // If the user specifies a preset name for reports, we should compare it directly
            // Otherwise, match the default name
            reportName ? file === reportName : file.startsWith('report.') && file.endsWith('.json'),
        );

        if (!recordNames.length) {
            return;
        }

        const reports: [path: string, report: BacktraceReport, sessionFiles?: SessionFiles][] = [];
        for (const recordName of recordNames) {
            const recordPath = path.join(databasePath, recordName);
            try {
                const recordJson = await this.fileSystem.readFile(recordPath);
                const report = converter.convert(JSON.parse(recordJson));
                reports.push([recordPath, report]);
            } catch {
                // Do nothing, skip the report
            }
        }

        // Sort reports by timestamp descending
        reports.sort((a, b) => b[1].timestamp - a[1].timestamp);

        // Map reports to sessions
        // When the sessions are sorted by timestamp, we can assume that each previous session maps to the next report
        let currentSession = this.sessionFiles?.getPreviousSession();
        for (const tuple of reports) {
            tuple[2] = currentSession;
            currentSession = currentSession?.getPreviousSession();
        }

        for (const [recordPath, report, session] of reports) {
            try {
                if (session) {
                    const breadcrumbsStorage = FileBreadcrumbsStorage.createFromSession(session);
                    if (breadcrumbsStorage) {
                        report.attachments.push(...breadcrumbsStorage.getAttachments());
                    }

                    const fileAttributes = FileAttributeManager.createFromSession(session, this.fileSystem);
                    Object.assign(report.attributes, await fileAttributes.get());

                    report.attributes['application.session'] = session.sessionId;
                } else {
                    report.attributes['application.session'] = null;
                }

                const data = this.generateSubmissionData(report);
                if (data) {
                    this.database.add(data, report.attachments);
                }
            } catch {
                // Do nothing, skip the report
            } finally {
                try {
                    await this.fileSystem.unlink(recordPath);
                } catch {
                    // Do nothing
                }
            }
        }

        await this.database.send();
    }
}
