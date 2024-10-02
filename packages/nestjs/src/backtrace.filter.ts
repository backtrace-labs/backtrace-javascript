import { BacktraceClient } from '@backtrace/node';
import { ArgumentsHost, HttpServer, Inject, Injectable, Optional } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { BacktraceExceptionHandler, BacktraceExceptionHandlerOptions } from './backtrace.handler.js';

export type BacktraceExceptionFilterOptions = BacktraceExceptionHandlerOptions<ArgumentsHost>;

@Injectable()
export class BacktraceExceptionFilter extends BaseExceptionFilter {
    private readonly _handler: BacktraceExceptionHandler;

    /**
     * Creates a filter with the global client instance.
     *
     * The instance will be resolved while catching the exception.
     * If the instance is not available, an error will be thrown.
     */
    constructor(options?: BacktraceExceptionFilterOptions, applicationRef?: HttpServer);
    /**
     * Creates a filter with the provided client instance.
     */
    constructor(
        options: BacktraceExceptionFilterOptions | undefined,
        client: BacktraceClient,
        applicationRef?: HttpServer,
    );
    constructor(handler: BacktraceExceptionHandler, applicationRef?: HttpServer);
    constructor(
        @Inject(BacktraceExceptionHandler)
        handlerOrOptions: BacktraceExceptionFilterOptions | BacktraceExceptionHandler | undefined,
        @Inject(BacktraceClient) @Optional() clientOrApplicationRef?: BacktraceClient | HttpServer,
        @Optional() maybeApplicationRef?: HttpServer,
    ) {
        const applicationRef =
            (maybeApplicationRef ?? clientOrApplicationRef instanceof BacktraceClient)
                ? maybeApplicationRef
                : clientOrApplicationRef;

        super(applicationRef);
        if (handlerOrOptions instanceof BacktraceExceptionHandler) {
            this._handler = handlerOrOptions;
            return;
        }

        const options = handlerOrOptions;
        if (clientOrApplicationRef instanceof BacktraceClient) {
            this._handler = new BacktraceExceptionHandler(options, clientOrApplicationRef);
        } else {
            this._handler = new BacktraceExceptionHandler(options);
        }
    }

    public catch(exception: unknown, host: ArgumentsHost): void {
        this._handler.handleException(exception, host);
        super.catch(exception, host);
    }
}
