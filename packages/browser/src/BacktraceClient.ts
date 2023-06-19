import {
    BacktraceConfiguration,
    BacktraceCoreClient,
    BacktraceRequestHandler,
    BacktraceStackTraceConverter,
} from '@backtrace/sdk-core';
import { AGENT } from './agentDefinition';
import { BacktraceClientBuilder } from './builder/BacktraceClientBuilder';

export class BacktraceClient extends BacktraceCoreClient {
    constructor(
        options: BacktraceConfiguration,
        handler: BacktraceRequestHandler,
        stackTraceConverter: BacktraceStackTraceConverter,
    ) {
        super(options, AGENT, handler, [], stackTraceConverter);
    }

    public static builder(options: BacktraceConfiguration): BacktraceClientBuilder {
        return new BacktraceClientBuilder(options);
    }
}
