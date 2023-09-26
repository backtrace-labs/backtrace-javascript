import { BacktraceClient } from '@backtrace-labs/node';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, throwError } from 'rxjs';

type ExceptionTypeFilter = (new (...args: never[]) => unknown)[] | ((err: unknown) => boolean);

export interface BacktraceInterceptorOptions {
    readonly includeExceptionTypes?: ExceptionTypeFilter;
    readonly excludeExceptionTypes?: ExceptionTypeFilter;
}

@Injectable()
export class BacktraceInterceptor implements NestInterceptor {
    constructor(private readonly _client: BacktraceClient, private readonly _options: BacktraceInterceptorOptions) {}

    public intercept(_: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
        return next.handle().pipe(
            catchError((err) => {
                if (
                    this._options.includeExceptionTypes &&
                    !this.filterException(err, this._options.includeExceptionTypes)
                ) {
                    return throwError(() => err);
                }

                if (
                    this._options.excludeExceptionTypes &&
                    this.filterException(err, this._options.excludeExceptionTypes)
                ) {
                    return throwError(() => err);
                }

                if (typeof err !== 'string' && !(err instanceof Error)) {
                    this._client.send(String(err));
                } else {
                    this._client.send(err);
                }

                return throwError(() => err);
            }),
        );
    }

    private filterException(exception: unknown, filter: ExceptionTypeFilter): boolean {
        if (Array.isArray(filter)) {
            return filter.some((f) => exception instanceof f);
        }

        return filter(exception);
    }
}
