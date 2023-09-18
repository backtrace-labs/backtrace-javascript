interface BaseResult<T, E> {
    map<N>(fn: (data: T) => N): Result<N, E>;
    mapErr<N>(fn: (data: E) => N): Result<T, N>;

    isOk(): this is ResultOk<T>;
    isErr(): this is ResultErr<E>;

    unwrap(): T;
}

export class UnwrapError<E> extends Error {
    constructor(public readonly data: E) {
        super('Operation has resulted in an error.');
    }
}

export type Result<T, E> = ResultOk<T> | ResultErr<E>;
export type ResultPromise<T, E> = Promise<Result<T, E>>;

export class R {
    public static map<T, E, NT>(
        transform: (data: T) => Result<NT, E> | Promise<Result<NT, E>>,
    ): (result: Result<T, E>) => Promise<Result<NT, E>>;
    public static map<T, E, N>(transform: (data: T) => N | Promise<N>): (result: Result<T, E>) => Promise<Result<N, E>>;
    public static map<T, E, N>(
        transform: (data: T) => N | Promise<N>,
    ): (result: Result<T, E>) => Promise<Result<N, E>> {
        return async (result) => (result.isErr() ? result : wrapOk(await transform(result.data)));
    }

    public static mapErr<T, E, NT, NE>(
        transform: (data: E) => Result<NT, NE> | Promise<Result<NT, NE>>,
    ): (result: Result<T, E>) => Promise<Result<NT, NE>>;
    public static mapErr<T, E, N>(
        transform: (data: E) => N | Promise<N>,
    ): (result: Result<T, E>) => Promise<Result<T, N>>;
    public static mapErr<T, E, N>(
        transform: (data: E) => N | Promise<N>,
    ): (result: Result<T, E>) => Promise<Result<T, N>> {
        return async (result) => (result.isOk() ? result : wrapErr(await transform(result.data)));
    }

    public static flatMap<T, E>(results: Result<T, E>[]): Result<T[], E> {
        const data: T[] = [];
        for (const result of results) {
            if (result.isErr()) {
                return result;
            }

            data.push(result.data);
        }

        return Ok(data);
    }
}

export class ResultOk<T> implements BaseResult<T, never> {
    constructor(public readonly data: T) {}

    public map<N>(transform: (data: T) => N): Result<N, never> {
        return new ResultOk(transform(this.data));
    }

    public mapErr<N>(): Result<T, N> {
        return this;
    }

    public isOk(): this is ResultOk<T> {
        return true;
    }

    public isErr(): this is ResultErr<never> {
        return false;
    }

    public unwrap(): T {
        return this.data;
    }
}

export class ResultErr<E> implements BaseResult<never, E> {
    constructor(public readonly data: E) {}

    public map<N>(): Result<N, E> {
        return this;
    }

    public mapErr<N>(fn: (data: E) => N): Result<never, N> {
        return new ResultErr(fn(this.data));
    }

    public isOk(): this is ResultOk<never> {
        return false;
    }

    public isErr(): this is ResultErr<E> {
        return true;
    }

    public unwrap(): never {
        throw new UnwrapError(this.data);
    }
}

export function Ok<T>(data: T): Result<T, never> {
    return new ResultOk(data);
}

export function Err<E>(data: E): Result<never, E> {
    return new ResultErr(data);
}

export function wrapOk<T, E>(data: T | Result<T, E>): Result<T, E> {
    if (data instanceof ResultOk || data instanceof ResultErr) {
        return data;
    }

    return Ok(data);
}

export function wrapErr<T, E>(data: E | Result<T, E>): Result<T, E> {
    if (data instanceof ResultOk || data instanceof ResultErr) {
        return data;
    }

    return Err(data);
}
