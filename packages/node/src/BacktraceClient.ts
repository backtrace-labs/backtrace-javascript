import {
    BacktraceAttributeProvider,
    BacktraceConfiguration as CoreConfiguration,
    BacktraceCoreClient,
    BacktraceRequestHandler,
} from '@backtrace/sdk-core';
import { AGENT } from './agentDefinition';
import { BacktraceConfiguration } from './BacktraceConfiguration';
import { BacktraceClientBuilder } from './builder/BacktraceClientBuilder';

export class BacktraceClient extends BacktraceCoreClient {
    constructor(
        options: CoreConfiguration,
        handler: BacktraceRequestHandler,
        attributeProviders: BacktraceAttributeProvider[],
    ) {
        super(options, AGENT, handler, attributeProviders);
    }

    public static builder(options: BacktraceConfiguration): BacktraceClientBuilder {
        return new BacktraceClientBuilder(options);
    }
}
