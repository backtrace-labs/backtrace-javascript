import { BacktraceReactClientBuilder, ReactStackTraceConverter, SingleSessionProvider } from '@backtrace-labs/react';
import { BacktraceClient } from './BacktraceClient';
import { type BacktraceConfiguration } from './BacktraceConfiguration';

export class BacktraceClientBuilder extends BacktraceReactClientBuilder {
    constructor(options: BacktraceConfiguration) {
        super(
            {
                name: 'test',
                version: '123',
                ...options,
            },
            [],
            [],
            new SingleSessionProvider(),
        );
    }
    public build(): BacktraceClient {
        return new BacktraceClient(
            this.options,
            this.handler,
            this.attributeProviders,
            this.stackTraceConverter ?? new ReactStackTraceConverter(this.generateStackTraceConverter()),
            this.breadcrumbsSubscribers,
            this.sessionProvider,
        );
    }
}
