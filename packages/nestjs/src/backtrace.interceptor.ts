import { BacktraceClient } from '@backtrace/node';
import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor, Optional } from '@nestjs/common';
import { HttpArgumentsHost, RpcArgumentsHost, WsArgumentsHost } from '@nestjs/common/interfaces';
import { type Request as ExpressRequest } from 'express';
import { Observable, catchError, throwError } from 'rxjs';

type ExceptionTypeFilter = (new (...args: never[]) => unknown)[] | ((err: unknown) => boolean);

export interface BacktraceInterceptorOptions {
    /**
     * If specified, only matching errors will be sent.
     *
     * Can be an array of error types, or a function returning `boolean`.
     * The error is passed to the function as first parameter.
     *
     * @example
     * // Include only InternalServerErrorException or errors deriving from it
     * {
     *   includeExceptionTypes: [InternalServerErrorException]
     * }
     *
     * // Include only errors that are instanceof InternalServerErrorException
     * {
     *   includeExceptionTypes: (error) => error instanceof InternalServerErrorException
     * }
     */
    readonly includeExceptionTypes?: ExceptionTypeFilter;

    /**
     * If specified, matching errors will not be sent.
     * Can be an array of error types, or a function returning `boolean`.
     * The error is passed to the function as first parameter.
     *
     * @example
     * // Exclude BadRequestException or errors deriving from it
     * {
     *   excludeExceptionTypes: [BadRequestException]
     * }
     *
     * // Exclude errors that are instanceof BadRequestException
     * {
     *   excludeExceptionTypes: (error) => error instanceof BadRequestException
     * }
     */
    readonly excludeExceptionTypes?: ExceptionTypeFilter;

    /**
     * Will not throw on initialization if `true` and the `BacktraceClient` instance is `undefined`.
     *
     * If this is `true` and the client instance is not available, the interceptor will not be run.
     *
     * @default false
     */
    readonly skipIfClientUndefined?: boolean;

    /**
     * This method will be called before sending the report.
     * Use this to build attributes that will be attached to the report.
     *
     * Note that this will overwrite the attributes. To add you own and keep the defaults, use `defaultAttributes`.
     * @param context Execution context.
     * @param defaultAttributes Attributes created by default by the interceptor.
     * @returns Attribute dictionary.
     *
     * @example
     * buildAttributes: (context, defaultAttributes) => ({
     *   ...defaultAttributes,
     *   'request.body': context.switchToHttp().getRequest().body
     * })
     */
    readonly buildAttributes?: (
        context: ExecutionContext,
        defaultAttributes: Record<string, unknown>,
    ) => Record<string, unknown>;
}

/**
 * Intercepts errors and sends them to Backtrace.
 */
@Injectable()
export class BacktraceInterceptor implements NestInterceptor {
    private readonly _client?: BacktraceClient;

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
    constructor(
        private readonly _options = BacktraceInterceptor.getDefaultOptions(),
        @Optional() client?: BacktraceClient,
    ) {
        this._client = client;
    }

    public intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
        const client = this._client ?? BacktraceClient.instance;
        if (!client) {
            if (this._options.skipIfClientUndefined) {
                return next.handle();
            }

            throw new Error('Backtrace instance is unavailable. Initialize the client first.');
        }

        return next.handle().pipe(
            catchError((err) => {
                if (!this.shouldSend(err)) {
                    return throwError(() => err);
                }

                let attributes: Record<string, unknown> = {
                    ...this.getBaseAttributes(context),
                    ...this.getTypeAttributes(context),
                };

                if (this._options.buildAttributes) {
                    attributes = this._options.buildAttributes(context, attributes);
                }

                if (typeof err !== 'string' && !(err instanceof Error)) {
                    client.send(String(err), attributes);
                } else {
                    client.send(err, attributes);
                }

                return throwError(() => err);
            }),
        );
    }

    private shouldSend(error: unknown) {
        if (this._options.includeExceptionTypes && !this.filterException(error, this._options.includeExceptionTypes)) {
            return false;
        }

        if (this._options.excludeExceptionTypes && this.filterException(error, this._options.excludeExceptionTypes)) {
            return false;
        }

        return true;
    }

    private getBaseAttributes(context: ExecutionContext) {
        const controller = context.getClass().name;
        const contextType = context.getType();

        return {
            'request.controller': controller,
            'request.contextType': contextType,
        };
    }

    private getTypeAttributes(context: ExecutionContext) {
        const type = context.getType();
        switch (type) {
            case 'http':
                return this.getHttpAttributes(context.switchToHttp());
            case 'rpc':
                return this.getRpcAttributes(context.switchToRpc());
            case 'ws':
                return this.getWsAttributes(context.switchToWs());
            default:
                return {};
        }
    }

    private getHttpAttributes(http: HttpArgumentsHost) {
        const request = http.getRequest();
        const expressRequest = request as ExpressRequest;
        return {
            'request.url': expressRequest.url,
            'request.baseUrl': expressRequest.baseUrl,
            'request.method': expressRequest.method,
            'request.originalUrl': expressRequest.originalUrl,
            'request.protocol': expressRequest.protocol,
            'request.hostname': expressRequest.hostname,
            'request.httpVersion': expressRequest.httpVersion,
        };
    }

    private getRpcAttributes(rpc: RpcArgumentsHost) {
        return {
            ['rpc.data']: rpc.getData(),
        };
    }

    private getWsAttributes(ws: WsArgumentsHost) {
        return {
            ['ws.data']: ws.getData(),
        };
    }

    private filterException(exception: unknown, filter: ExceptionTypeFilter): boolean {
        if (Array.isArray(filter)) {
            return filter.some((f) => exception instanceof f);
        }

        return filter(exception);
    }

    private static getDefaultOptions(): BacktraceInterceptorOptions {
        return {
            includeExceptionTypes: [Error],
            excludeExceptionTypes: (error) => error instanceof HttpException && error.getStatus() < 500,
            skipIfClientUndefined: false,
        };
    }
}
