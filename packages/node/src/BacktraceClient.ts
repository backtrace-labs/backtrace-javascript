import {
    BacktraceAttributeProvider,
    BacktraceCoreClient,
    BacktraceRequestHandler,
    BacktraceConfiguration as CoreConfiguration,
    DebugIdContainer,
    VariableDebugIdMapProvider,
} from '@backtrace/sdk-core';
import { BacktraceConfiguration } from './BacktraceConfiguration';
import { AGENT } from './agentDefinition';
import { BacktraceClientBuilder } from './builder/BacktraceClientBuilder';

export class BacktraceClient extends BacktraceCoreClient {
    constructor(
        options: CoreConfiguration,
        handler: BacktraceRequestHandler,
        attributeProviders: BacktraceAttributeProvider[],
    ) {
        super(
            options,
            AGENT,
            handler,
            attributeProviders,
            undefined,
            undefined,
            new VariableDebugIdMapProvider(global as DebugIdContainer),
        );
    }

    public static builder(options: BacktraceConfiguration): BacktraceClientBuilder {
        return new BacktraceClientBuilder(options);
    }
}
