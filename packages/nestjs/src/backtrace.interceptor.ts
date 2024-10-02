import { BacktraceClient } from '@backtrace/node';
import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor, Optional } from '@nestjs/common';
import { Observable, catchError, throwError } from 'rxjs';
import { BacktraceExceptionHandler, BacktraceExceptionHandlerOptions } from './backtrace.handler.js';

export type BacktraceInterceptorOptions = BacktraceExceptionHandlerOptions<ExecutionContext>;

/**
 * Intercepts errors and sends them to Backtrace.
 */
@Injectable()
export class BacktraceInterceptor implements NestInterceptor {
    private readonly _handler: BacktraceExceptionHandler<ExecutionContext>;

    /**
     * Creates an interceptor with the global client instance.
     *
     * The instance will be resolved while intercepting the request.
     * If the instance is not available, an error will be thrown.
     */
    constructor(options?: BacktraceInterceptorOptions);
    /**
     * Creates an interceptor with the provided client instance.
     */
    constructor(options: BacktraceInterceptorOptions | undefined, client: BacktraceClient);
    constructor(handler: BacktraceExceptionHandler<ExecutionContext>);
    constructor(
        @Inject(BacktraceExceptionHandler)
        handlerOrOptions: BacktraceInterceptorOptions | BacktraceExceptionHandler<ExecutionContext> | undefined,
        @Optional() client?: BacktraceClient,
    ) {
        if (handlerOrOptions instanceof BacktraceExceptionHandler) {
            this._handler = handlerOrOptions;
            return;
        }

        const options = handlerOrOptions;
        const handlerOptions: BacktraceInterceptorOptions = {
            ...options,
            buildAttributes: BacktraceInterceptor.extendBuildAttributes(options?.buildAttributes),
        };

        if (client) {
            this._handler = new BacktraceExceptionHandler(handlerOptions, client);
        } else {
            this._handler = new BacktraceExceptionHandler(handlerOptions);
        }
    }

    public intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
        return next.handle().pipe(
            catchError((err) => {
                this._handler.handleException(err, context);
                return throwError(() => err);
            }),
        );
    }

    private static extendBuildAttributes(
        buildAttributes?: BacktraceInterceptorOptions['buildAttributes'],
    ): BacktraceInterceptorOptions['buildAttributes'] {
        const getAttributes: BacktraceInterceptorOptions['buildAttributes'] = (context, attributes) => {
            const controller = context.getClass().name;

            return {
                ...attributes,
                'request.controller': controller,
            };
        };

        if (!buildAttributes) {
            return getAttributes;
        }

        return (context, attributes) => buildAttributes(context, getAttributes(context, attributes));
    }
}
