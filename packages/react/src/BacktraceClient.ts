import {
    BacktraceAttributeProvider,
    BacktraceCoreClient,
    BacktraceRequestHandler,
    BacktraceStackTraceConverter,
} from '@backtrace/sdk-core';
import { AGENT } from '@backtrace/browser';
import { BacktraceConfiguration } from '@backtrace/browser';
import { BacktraceClientBuilder } from '@backtrace/browser';

declare global {
    interface Window {
        backtraceClient?: BacktraceClient;
    }
}

export class BacktraceClient extends BacktraceCoreClient {
    constructor(
        options: BacktraceConfiguration,
        handler: BacktraceRequestHandler,
        attributeProviders: BacktraceAttributeProvider[],
        stackTraceConverter: BacktraceStackTraceConverter,
    ) {
        super(options, AGENT, handler, attributeProviders, stackTraceConverter);
    }

    public static builder(options: BacktraceConfiguration): BacktraceClientBuilder {
        return new BacktraceClientBuilder(options);
    }

    public static initialize(options: BacktraceConfiguration): BacktraceClient {
        const client = this.builder(options).build();
        if (typeof window === 'object' && window.Math === Math) {
            window.backtraceClient = client;
        }
        return client;
    }
}
