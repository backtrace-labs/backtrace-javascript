import {
    BacktraceAttributeProvider,
    BacktraceCoreClient,
    BacktraceRequestHandler,
    BacktraceStackTraceConverter,
} from '@backtrace/sdk-core';
import { AGENT } from './agentDefinition';
import { BacktraceBrowserSessionProvider } from './BacktraceBrowserSessionProvider';
import { BacktraceConfiguration } from './BacktraceConfiguration';
import { BacktraceClientBuilder } from './builder/BacktraceClientBuilder';

export class BacktraceClient extends BacktraceCoreClient {
    constructor(
        options: BacktraceConfiguration,
        handler: BacktraceRequestHandler,
        attributeProviders: BacktraceAttributeProvider[],
        stackTraceConverter: BacktraceStackTraceConverter,
    ) {
        super(options, AGENT, handler, attributeProviders, stackTraceConverter, new BacktraceBrowserSessionProvider());
    }

    public static builder(options: BacktraceConfiguration): BacktraceClientBuilder {
        return new BacktraceClientBuilder(options);
    }
}
