import { BacktraceClient } from '@backtrace-labs/node';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { HttpArgumentsHost, RpcArgumentsHost, WsArgumentsHost } from '@nestjs/common/interfaces';
import { Observable, catchError, throwError } from 'rxjs';

type ExceptionTypeFilter = (new (...args: never[]) => unknown)[] | ((err: unknown) => boolean);

export interface BacktraceInterceptorOptions {
    readonly includeExceptionTypes?: ExceptionTypeFilter;
    readonly excludeExceptionTypes?: ExceptionTypeFilter;
}

@Injectable()
export class BacktraceInterceptor implements NestInterceptor {
    private readonly _client?: BacktraceClient;

    constructor(private readonly _options?: BacktraceInterceptorOptions, @Optional() client?: BacktraceClient) {
        this._client = client;
    }

    public intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
        const client = this._client ?? BacktraceClient.instance;
        if (!client) {
            throw new Error('Backtrace instance is unavailable. Initialize the client first.');
        }

        return next.handle().pipe(
            catchError((err) => {
                if (!this.shouldSend(err)) {
                    return throwError(() => err);
                }

                const attributes = this.getAttributes(context);

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
        if (!this._options) {
            return true;
        }

        if (this._options.includeExceptionTypes && !this.filterException(error, this._options.includeExceptionTypes)) {
            return false;
        }

        if (this._options.excludeExceptionTypes && this.filterException(error, this._options.excludeExceptionTypes)) {
            return false;
        }

        return true;
    }

    private getAttributes(context: ExecutionContext) {
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
        return {
            request: http.getRequest(),
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
}
