import { BacktraceCoreApi, BacktraceCoreApiOptions } from '@backtrace/sdk-core';
import { BacktraceNodeRequestHandler, BacktraceNodeRequestHandlerOptions } from './BacktraceNodeRequestHandler.js';

export interface BacktraceApiOptions extends BacktraceCoreApiOptions {
    readonly requestHandlerOptions?: BacktraceNodeRequestHandlerOptions;
}

export class BacktraceApi extends BacktraceCoreApi {
    constructor(options: BacktraceApiOptions) {
        super(options, options.requestHandler ?? new BacktraceNodeRequestHandler(options.requestHandlerOptions));
    }
}
