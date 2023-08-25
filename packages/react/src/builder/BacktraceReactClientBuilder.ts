import { BacktraceClientBuilder, BacktraceConfiguration, BreadcrumbsEventSubscriber } from '@backtrace-labs/browser';
import { BacktraceAttributeProvider, BacktraceSessionProvider } from '@backtrace-labs/sdk-core';
import { BacktraceClient } from '../BacktraceClient';
import { ReactStackTraceConverter } from '../converters/ReactStackTraceConverter';

export class BacktraceReactClientBuilder extends BacktraceClientBuilder {
    constructor(
        options: BacktraceConfiguration,
        attributeProviders?: BacktraceAttributeProvider[],
        breadcrumbSubscribers?: BreadcrumbsEventSubscriber[],
        sessionProvider?: BacktraceSessionProvider,
    ) {
        super(options, attributeProviders, breadcrumbSubscribers, sessionProvider);
    }

    public build(): BacktraceClient {
        return new BacktraceClient(
            this.options,
            this.handler,
            this.attributeProviders,
            this.stackTraceConverter ?? new ReactStackTraceConverter(this.generateStackTraceConverter()),
            this.breadcrumbSubscribers,
            this.sessionProvider,
        );
    }
}
