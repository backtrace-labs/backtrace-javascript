import { BacktraceCoreClientBuilder } from '@backtrace-labs/sdk-core';
import { BacktraceClient } from './BacktraceClient';
import { type BacktraceConfiguration } from './BacktraceConfiguration';
import { ReactnativeRequestHandler } from './ReactNativeRequestHandler';

export class BacktraceClientBuilder extends BacktraceCoreClientBuilder<BacktraceClient> {
    constructor(private readonly _options: BacktraceConfiguration) {
        super(new ReactnativeRequestHandler(_options), []);
    }
    public build(): BacktraceClient {
        return new BacktraceClient(this._options, this.handler, this.attributeProviders, this.breadcrumbSubscribers);
    }
}
