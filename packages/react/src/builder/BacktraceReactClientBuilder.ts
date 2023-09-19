import { BacktraceClientBuilder, BacktraceConfiguration, BreadcrumbsEventSubscriber } from '@backtrace-labs/browser';
import { BacktraceAttributeProvider, BacktraceSessionProvider } from '@backtrace-labs/sdk-core';
import { BacktraceClient } from '../BacktraceClient';
import { ReactStackTraceConverter } from '../converters/ReactStackTraceConverter';

export class BacktraceReactClientBuilder extends BacktraceClientBuilder {
    constructor(
        options: BacktraceConfiguration,
        attributeProviders?: BacktraceAttributeProvider[],
        breadcrumbsSubscribers?: BreadcrumbsEventSubscriber[],
        sessionProvider?: BacktraceSessionProvider,
    ) {
        super(options, attributeProviders, breadcrumbsSubscribers, sessionProvider);
    }

    public build(): BacktraceClient {
        const instance = new BacktraceClient(
            this.options,
            this.handler,
            this.attributeProviders,
            this.stackTraceConverter ?? new ReactStackTraceConverter(this.generateStackTraceConverter()),
            this.breadcrumbsSubscribers,
            this.sessionProvider,
        );
        instance.initialize();
        return instance;
    }
}
