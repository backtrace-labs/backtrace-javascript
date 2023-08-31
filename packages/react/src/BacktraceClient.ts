import {
    BacktraceAttributeProvider,
    BacktraceClient as BrowserClient,
    BacktraceConfiguration,
    BacktraceRequestHandler,
    BacktraceStackTraceConverter,
    BreadcrumbsEventSubscriber,
} from '@backtrace-labs/browser';
import { BacktraceSessionProvider, SdkOptions } from '@backtrace-labs/sdk-core';
import { AGENT } from './agentDefinition';
import { BacktraceReactClientBuilder } from './builder/BacktraceReactClientBuilder';

export class BacktraceClient extends BrowserClient {
    protected static _instance?: BacktraceClient;

    constructor(
        options: BacktraceConfiguration,
        requestHandler: BacktraceRequestHandler,
        attributeProviders: BacktraceAttributeProvider[],
        stackTraceConverter: BacktraceStackTraceConverter,
        breadcrumbsEventSubscriber: BreadcrumbsEventSubscriber[],
        sessionProvider?: BacktraceSessionProvider,
        sdkOptions: SdkOptions = AGENT,
    ) {
        super(
            options,
            requestHandler,
            attributeProviders,
            stackTraceConverter,
            breadcrumbsEventSubscriber,
            sessionProvider,
            sdkOptions,
        );
    }

    public static builder(options: BacktraceConfiguration): BacktraceReactClientBuilder {
        return new BacktraceReactClientBuilder(options);
    }
    /**
     * Initializes the client. If the client already exists, the available instance
     * will be returned and all other options will be ignored.
     * @param options client configuration
     * @param build builder
     * @returns backtrace client
     */
    public static initialize(options: BacktraceConfiguration, build?: (builder: BacktraceReactClientBuilder) => void) {
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
}
