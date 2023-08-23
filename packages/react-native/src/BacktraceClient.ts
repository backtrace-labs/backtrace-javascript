import { ReactStackTraceConverter } from '@backtrace/react';
import {
    BacktraceCoreClient,
    VariableDebugIdMapProvider,
    type BacktraceAttributeProvider,
    type BacktraceRequestHandler,
    type BreadcrumbsEventSubscriber,
    type DebugIdContainer,
} from '@backtrace/sdk-core';
import { V8StackTraceConverter } from '@backtrace/sdk-core/lib/modules/converter/V8StackTraceConverter';
import { version } from 'react-native/package.json';
import { BacktraceClientBuilder } from './BacktraceClientBuilder';
import { type BacktraceConfiguration } from './BacktraceConfiguration';

export class BacktraceClient extends BacktraceCoreClient {
    private static _instance?: BacktraceClient;
    constructor(
        options: BacktraceConfiguration,
        handler: BacktraceRequestHandler,
        attributeProviders: BacktraceAttributeProvider[],
        breadcrumbsEventSubscribers: BreadcrumbsEventSubscriber[],
    ) {
        super(
            options,
            {
                agent: '@backtrace/react-native',
                agentVersion: '0.0.1',
                langName: 'react-native',
                langVersion: version,
            },
            handler,
            attributeProviders,
            new ReactStackTraceConverter(new V8StackTraceConverter()),
            undefined,
            new VariableDebugIdMapProvider(global as DebugIdContainer),
            {
                subscribers: breadcrumbsEventSubscribers,
            },
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
}
