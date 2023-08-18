import { BacktraceReactClientBuilder, ReactStackTraceConverter } from '@backtrace/react';
import { BacktraceClient } from './BacktraceClient';
export class BacktraceClientBuilder extends BacktraceReactClientBuilder {
    public build(): BacktraceClient {
        return new BacktraceClient(
            this.options,
            this.handler,
            this.attributeProviders,
            new ReactStackTraceConverter(this.generateStackTraceConverter()),
            this.breadcrumbSubscribers,
        );
    }
}
