import { ReactStackTraceConverter } from '@backtrace-labs/react';
import {
    BacktraceCoreClient,
    BacktraceReport,
    SingleSessionProvider,
    V8StackTraceConverter,
    VariableDebugIdMapProvider,
    type BacktraceAttributeProvider,
    type BacktraceRequestHandler,
    type BreadcrumbsEventSubscriber,
    type DebugIdContainer,
} from '@backtrace-labs/sdk-core';
import { BacktraceClientBuilder } from './BacktraceClientBuilder';
import { type BacktraceConfiguration } from './BacktraceConfiguration';
import type { HermesUnhandledRejection } from './types/HermesUnhandledRejection';
import { enableUnhandledPromiseRejectionTracker } from './unhandledPromiseRejectionTracker';

export class BacktraceClient extends BacktraceCoreClient {
    private static _instance?: BacktraceClient;
    constructor(
        options: BacktraceConfiguration,
        requestHandler: BacktraceRequestHandler,
        attributeProviders: BacktraceAttributeProvider[],
        breadcrumbsEventSubscribers: BreadcrumbsEventSubscriber[],
    ) {
        super({
            options,
            sdkOptions: {
                agent: '@backtrace/react-native',
                agentVersion: '1.0.0',
                langName: 'react-native',
                langVersion: 'unknown',
            },
            requestHandler,
            attributeProviders,
            debugIdMapProvider: new VariableDebugIdMapProvider(global as DebugIdContainer),
            breadcrumbsSetup: {
                subscribers: breadcrumbsEventSubscribers,
            },
            stackTraceConverter: new ReactStackTraceConverter(new V8StackTraceConverter()),
            sessionProvider: new SingleSessionProvider(),
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
    public static initialize(options: BacktraceConfiguration, build?: (builder: BacktraceClientBuilder) => void) {
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
            const globalErrorHandler = ErrorUtils.getGlobalHandler();
            ErrorUtils.setGlobalHandler((error: Error, fatal?: boolean) => {
                this.send(error, {
                    'error.type': 'Unhandled exception',
                    fatal,
                }).then(() => {
                    globalErrorHandler(error, fatal);
                });
            });
        }

        if (captureUnhandledRejections) {
            const hermesInternal = (global as unknown as { HermesInternal: HermesUnhandledRejection | undefined })
                ?.HermesInternal;

            if (hermesInternal?.hasPromise?.() && hermesInternal?.enablePromiseRejectionTracker) {
                hermesInternal.enablePromiseRejectionTracker({
                    allRejections: true,
                    onUnhandled: (id: number, rejection: Error | object = {}) => {
                        this.send(
                            new BacktraceReport(
                                rejection as Error,
                                {
                                    'error.type': 'Unhandled exception',
                                    unhandledPromiseRejectionId: id,
                                },
                                [],
                                {
                                    classifiers: ['UnhandledPromiseRejection'],
                                    skipFrames: rejection instanceof Error ? 0 : 1,
                                },
                            ),
                        );
                    },
                });
            } else {
                enableUnhandledPromiseRejectionTracker(this);
            }
        }
    }
}
