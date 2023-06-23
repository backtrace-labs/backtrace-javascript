import {
    BacktraceAttributeProvider,
    BacktraceCoreClient,
    BacktraceRequestHandler,
    BacktraceStackTraceConverter,
    DebugIdContainer,
    VariableDebugIdMapProvider,
} from '@backtrace/sdk-core';
import { BacktraceBrowserSessionProvider } from './BacktraceBrowserSessionProvider';
import { BacktraceConfiguration } from './BacktraceConfiguration';
import { AGENT } from './agentDefinition';
import { BacktraceClientBuilder } from './builder/BacktraceClientBuilder';

export class BacktraceClient extends BacktraceCoreClient {
    constructor(
        options: BacktraceConfiguration,
        handler: BacktraceRequestHandler,
        attributeProviders: BacktraceAttributeProvider[],
        stackTraceConverter: BacktraceStackTraceConverter,
    ) {
        super(
            options,
            AGENT,
            handler,
            attributeProviders,
            stackTraceConverter,
            new BacktraceBrowserSessionProvider(),
            new VariableDebugIdMapProvider(window as DebugIdContainer),
        );
    }

    public static builder(options: BacktraceConfiguration): BacktraceClientBuilder {
        return new BacktraceClientBuilder(options);
    }
}
