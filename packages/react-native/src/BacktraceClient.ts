import { ReactStackTraceConverter } from '@backtrace-labs/react';
import {
    BacktraceCoreClient,
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
            enableUnhandledPromiseRejectionTracker(this);
            //             const hermesInternal = HermesInternal as HermesUnhandledRejection | undefined;
            //             if (hermesInternal?.hasPromise?.() && hermesInternal?.enablePromiseRejectionTracker) {
            //                 hermesInternal.enablePromiseRejectionTracker({
            //                     allRejections: true,
            //                     onUnhandled: (id: number, rejection: Error | object = {}) => {
            //                         this.send(
            //                             new BacktraceReport(
            //                                 rejection as Error,
            //                                 {
            //                                     'error.type': 'Unhandled exception',
            //                                     unhandledPromiseRejectionId: id,
            //                                 },
            //                                 [],
            //                                 {
            //                                     classifiers: ['UnhandledPromiseRejection'],
            //                                     skipFrames: rejection instanceof Error ? 0 : 1,
            //                                 },
            //                             ),
            //                         );
            //                     },
            //                 });
            //             } else {
            //                 require('promise/setimmediate/rejection-tracking').enable({
            //     allRejections: true,
            //     onUnhandled: (id, rejection = {}) => {
            //       let message: string;
            //       let stack: ?string;

            //       const stringValue = Object.prototype.toString.call(rejection);
            //       if (stringValue === '[object Error]') {
            //         message = Error.prototype.toString.call(rejection);
            //         const error: Error = (rejection: $FlowFixMe);
            //         stack = error.stack;
            //       } else {
            //         try {
            //           message = require('pretty-format')(rejection);
            //         } catch {
            //           message =
            //             typeof rejection === 'string'
            //               ? rejection
            //               : JSON.stringify((rejection: $FlowFixMe));
            //         }
            //       }

            //       const warning =
            //         `Possible Unhandled Promise Rejection (id: ${id}):\n` +
            //         `${message ?? ''}\n` +
            //         (stack == null ? '' : stack);
            //       console.warn(warning);
            //     },
            //     onHandled: id => {
            //       const warning =
            //         `Promise Rejection Handled (id: ${id})\n` +
            //         'This means you can ignore any previous messages of the form ' +
            //         `"Possible Unhandled Promise Rejection (id: ${id}):"`;
            //       console.warn(warning);
            //     },
            //   });
            // }
        }
    }
}
