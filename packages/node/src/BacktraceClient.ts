import {
    BacktraceAttributeProvider,
    BacktraceConfiguration,
    BacktraceCoreClient,
    BacktraceRequestHandler,
} from '@backtrace/sdk-core';
import { AGENT } from './agentDefinition';
import { BacktraceClientBuilder } from './builder/BacktraceClientBuilder';

export class BacktraceClient extends BacktraceCoreClient {
    constructor(
        options: BacktraceConfiguration,
        handler: BacktraceRequestHandler,
        attributeProviders: BacktraceAttributeProvider[],
    ) {
        super(options, AGENT, handler, attributeProviders);
    }

    public static builder(options: BacktraceConfiguration): BacktraceClientBuilder {
        return new BacktraceClientBuilder(options);
    }
}
