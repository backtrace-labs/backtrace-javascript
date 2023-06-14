import { BacktraceConfiguration, BacktraceCoreClientBuilder } from '@backtrace/sdk-core';
import { BacktraceClient } from '../BacktraceClient';
import { BacktraceNodeRequestHandler } from '../BacktraceNodeRequestHandler';

export class BacktraceClientBuilder extends BacktraceCoreClientBuilder<BacktraceClient> {
    constructor(private readonly _options: BacktraceConfiguration) {
        super(new BacktraceNodeRequestHandler(_options));
    }
    public build(): BacktraceClient {
        return new BacktraceClient(this._options, this.handler);
    }
}
