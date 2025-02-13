import { BacktraceCoreApi, BacktraceCoreApiOptions, BacktraceRequestHandler } from '@backtrace/sdk-core';
import {
    BacktraceBrowserRequestHandler,
    BacktraceBrowserRequestHandlerOptions,
} from './BacktraceBrowserRequestHandler.js';

export interface BacktraceApiOptions extends BacktraceCoreApiOptions {
    readonly requestHandlerOptions?: BacktraceBrowserRequestHandlerOptions;
    readonly requestHandler?: BacktraceRequestHandler;
}

export class BacktraceApi extends BacktraceCoreApi {
    constructor(options: BacktraceApiOptions) {
        super(options, options.requestHandler ?? new BacktraceBrowserRequestHandler(options.requestHandlerOptions));
    }
}
