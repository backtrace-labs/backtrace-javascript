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
import { CrashReporter } from './crashReporter/CrashReporter';
import type { HermesUnhandledRejection } from './types/HermesUnhandledRejection';
import { enableUnhandledPromiseRejectionTracker } from './unhandledPromiseRejectionTracker';

export class BacktraceClient extends BacktraceCoreClient {
    private readonly _crashReporter: CrashReporter = new CrashReporter();
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
        this._crashReporter.initialize(options.url, this.attributeManager.get('scoped').attributes, this.attachments);

        // function allocateMemory(size: number) {
        //     const numbers = size / 8;
        //     const arr = [];
        //     arr.length = numbers;
        //     for (let i = 0; i < numbers; i++) {
        //         arr[i] = i;
        //     }
        //     return arr;
        // }

        // const TIME_INTERVAL_IN_MSEC = 40;
        // const memoryLeakAllocations = [];

        // console.log('This may take a while dependning on Node memory limits.');
        // console.log('For best results, start with --max-old-space-size set to a low value, like 100.');
        // console.log('e.g. node --max-old-space-size=100 lib/index.js');
        // setInterval(() => {
        //     const allocation = allocateMemory(10 * 1024 * 1024);
        //     memoryLeakAllocations.push(allocation);
        // }, TIME_INTERVAL_IN_MSEC);

        setTimeout(() => {
            this._crashReporter.crash();
        }, 15_000);
    }

    /**
     * Add attribute to Backtrace Client reports.
     * @param attributes key-value object with attributes.
     */
    public addAttribute(attributes: Record<string, unknown>): void;
    /**
     * Add dynamic attributes to Backtrace Client reports.
     * @param attributes function returning key-value object with attributes.
     */
    public addAttribute(attributes: () => Record<string, unknown>): void;
    public addAttribute(attributes: Record<string, unknown> | (() => Record<string, unknown>)) {
        super.addAttribute(attributes as Record<string, unknown>);
        this._crashReporter?.updateAttributes(super.attributes);
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
