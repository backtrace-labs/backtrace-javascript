import {
    BacktraceAttributeProvider,
    BacktraceCoreClient,
    BacktraceRequestHandler,
    BacktraceStackTraceConverter,
} from '@backtrace/sdk-core';
import { AGENT } from '@backtrace/browser';
import { BacktraceConfiguration } from '@backtrace/browser';
import { BacktraceClientBuilder } from '@backtrace/browser';

export class BacktraceClient extends BacktraceCoreClient {
    private static _instance?: BacktraceClient;
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
        this._instance = this.builder(options).build();
        return this._instance;
    }

    public static get instance(): BacktraceClient {
        if (!this._instance) {
            throw new Error('BacktraceClient is uninitialized. Call "BacktraceClient.initialize" function first.');
        }
        return this._instance;
    }
}
