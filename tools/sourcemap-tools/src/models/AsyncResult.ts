import { Result, ResultErr, ResultOk, flatMap, wrapErr, wrapOk } from './Result';

export type ResultPromise<T, E> = Promise<Result<T, E>>;

export class AsyncResult<T, E> {
    constructor(private readonly _promise: Promise<Result<T, E>>) {}

    public static equip<T, E>(
        asyncResult: Result<T, E> | (() => Result<T, E>) | ResultPromise<T, E> | (() => ResultPromise<T, E>),
    ): AsyncResult<T, E> {
        if (asyncResult instanceof Promise) {
            return new AsyncResult(asyncResult);
        }

        if (asyncResult instanceof ResultOk || asyncResult instanceof ResultErr) {
            return new AsyncResult(new Promise((resolve) => resolve(asyncResult)));
        }

        const fnResult = asyncResult();
        if (fnResult instanceof Promise) {
            return new AsyncResult(fnResult);
        }

        return new AsyncResult(new Promise((resolve) => resolve(fnResult)));
    }

    public then<N>(
        transform: (data: T) => Result<N, E>[] | Promise<Result<N, E>[]> | Promise<Result<N, E>>[],
    ): AsyncResult<N[], E>;
    public then<N>(transform: (data: T) => Result<N, E> | Promise<Result<N, E>>): AsyncResult<N, E>;
    public then<N>(transform: (data: T) => N | Promise<N>): AsyncResult<N, E>;
    public then<N>(
        transform: (
            data: T,
        ) =>
            | Result<N, E>
            | Promise<Result<N, E>>
            | Promise<Result<N, E>>[]
            | Result<N, E>[]
            | Promise<Result<N, E>[]>
            | N
            | Promise<N>,
    ): AsyncResult<N | N[], E> {
        return new AsyncResult<N | N[], E>(
            this._promise.then((result) => {
                if (!result.isOk()) {
                    return result;
                }

                const transformResult = transform(result.data);
                if (transformResult instanceof Promise) {
                    return transformResult.then((v) => {
                        if (Array.isArray(v)) {
                            return flatMap(v.map(wrapOk));
                        }

                        return wrapOk(v);
                    });
                }

                if (Array.isArray(transformResult)) {
                    return Promise.all(transformResult).then((r) => flatMap(r.map(wrapOk)));
                }

                return wrapOk(transformResult);
            }),
        );
    }

    public thenErr<N>(transform: (data: E) => Promise<Result<T, N>>): AsyncResult<T, N>;
    public thenErr<N>(transform: (data: E) => Result<T, N>): AsyncResult<T, N>;
    public thenErr<N>(transform: (data: E) => Promise<N>): AsyncResult<T, N>;
    public thenErr<N>(transform: (data: E) => N): AsyncResult<T, N>;
    public thenErr<N>(transform: (data: E) => Result<T, N> | N | Promise<N | Result<T, N>>): AsyncResult<T, N>;
    public thenErr<N>(transform: (data: E) => Result<T, N> | N | Promise<N | Result<T, N>>): AsyncResult<T, N> {
        return new AsyncResult<T, N>(
            this._promise.then((result) => {
                if (!result.isErr()) {
                    return result;
                }

                const transformResult = transform(result.data);
                if (transformResult instanceof Promise) {
                    return transformResult.then((v) => wrapErr(v));
                }

                return wrapErr(transformResult);
            }),
        );
    }

    public get inner() {
        return this._promise;
    }
}

export function OkAsync<T, E>(data: T): AsyncResult<T, E> {
    return new AsyncResult(new Promise((resolve) => resolve(new ResultOk(data))));
}

export function ErrAsync<T, E>(data: E): AsyncResult<T, E> {
    return new AsyncResult(new Promise((resolve) => resolve(new ResultErr(data))));
}
