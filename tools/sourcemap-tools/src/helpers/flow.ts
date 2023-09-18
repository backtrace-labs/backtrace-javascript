export function flow<A, B>(fnAb: (a: A) => B | Promise<B>): (a: A) => Promise<B>;
export function flow<A, B, C>(
    ...fns: [...Parameters<typeof flow<A, B>>, (b: B) => C | Promise<C>]
): (a: A) => Promise<C>;
export function flow<A, B, C, D>(
    ...fns: [...Parameters<typeof flow<A, B, C>>, (c: C) => D | Promise<D>]
): (a: A) => Promise<D>;
export function flow<A, B, C, D, E>(
    ...fns: [...Parameters<typeof flow<A, B, C, D>>, (d: D) => E | Promise<E>]
): (a: A) => Promise<E>;
export function flow<A, B, C, D, E, F>(
    ...fns: [...Parameters<typeof flow<A, B, C, D, E>>, (e: E) => F | Promise<F>]
): (a: A) => Promise<F>;
export function flow<A, B, C, D, E, F, G>(
    ...fns: [...Parameters<typeof flow<A, B, C, D, E, F>>, (f: F) => G | Promise<G>]
): (a: A) => Promise<G>;
export function flow<A, B, C, D, E, F, G, H>(
    ...fns: [...Parameters<typeof flow<A, B, C, D, E, F, G>>, (g: G) => H | Promise<H>]
): (a: A) => Promise<H>;
export function flow<A, B, C, D, E, F, G, H, I>(
    ...fns: [...Parameters<typeof flow<A, B, C, D, E, F, G, H>>, (h: H) => I | Promise<I>]
): (a: A) => Promise<I>;
export function flow<A, B, C, D, E, F, G, H, I, J>(
    ...fns: [...Parameters<typeof flow<A, B, C, D, E, F, G, H, I>>, (i: I) => J | Promise<J>]
): (a: A) => Promise<J>;
export function flow<A, B, C, D, E, F, G, H, I, J, K>(
    ...fns: [...Parameters<typeof flow<A, B, C, D, E, F, G, H, I, J>>, (j: J) => K | Promise<K>]
): (a: A) => Promise<K>;
export function flow<A, B, C, D, E, F, G, H, I, J, K, L>(
    ...fns: [...Parameters<typeof flow<A, B, C, D, E, F, G, H, I, J, K>>, (k: K) => L | Promise<L>]
): (a: A) => Promise<L>;
export function flow<A, B, C, D, E, F, G, H, I, J, K, L, M>(
    ...fns: [...Parameters<typeof flow<A, B, C, D, E, F, G, H, I, J, K, L>>, (l: L) => M | Promise<M>]
): (a: A) => Promise<M>;
export function flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N>(
    ...fns: [...Parameters<typeof flow<A, B, C, D, E, F, G, H, I, J, K, L, M>>, (m: M) => N | Promise<N>]
): (a: A) => Promise<N>;
export function flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(
    ...fns: [...Parameters<typeof flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N>>, (n: N) => O | Promise<O>]
): (a: A) => Promise<O>;
export function flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(
    ...fns: [...Parameters<typeof flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>>, (o: O) => P | Promise<P>]
): (a: A) => Promise<P>;
export function flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(
    ...fns: [...Parameters<typeof flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>>, (p: P) => Q | Promise<Q>]
): (a: A) => Promise<Q>;
export function flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(
    ...fns: [...Parameters<typeof flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>>, (q: Q) => R | Promise<R>]
): (a: A) => Promise<R>;
export function flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(
    ...fns: [...Parameters<typeof flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>>, (r: R) => S | Promise<S>]
): (a: A) => Promise<S>;
export function flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>(
    ...fns: [
        ...Parameters<typeof flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>>,
        (s: S) => T | Promise<T>,
    ]
): (a: A) => Promise<T>;
export function flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U>(
    ...fns: [
        ...Parameters<typeof flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>>,
        (t: T) => U | Promise<U>,
    ]
): (a: A) => Promise<U>;
export function flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V>(
    ...fns: [
        ...Parameters<typeof flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U>>,
        (u: U) => V | Promise<V>,
    ]
): (a: A) => Promise<V>;
export function flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W>(
    ...fns: [
        ...Parameters<typeof flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V>>,
        (v: V) => W | Promise<W>,
    ]
): (a: A) => Promise<W>;
export function flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X>(
    ...fns: [
        ...Parameters<typeof flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W>>,
        (w: W) => X | Promise<X>,
    ]
): (a: A) => Promise<X>;
export function flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y>(
    ...fns: [
        ...Parameters<typeof flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X>>,
        (x: X) => Y | Promise<Y>,
    ]
): (a: A) => Promise<Y>;
export function flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z>(
    ...fns: [
        ...Parameters<typeof flow<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y>>,
        (y: Y) => Z | Promise<Z>,
    ]
): (a: A) => Promise<Z>;
export function flow(...fns: ((v: unknown) => unknown | Promise<unknown>)[]): (v: unknown) => Promise<unknown> {
    return async (a) => _pipe(a, ...fns);
}

export function pipe<A, B>(value: A, fnAb: (a: A) => B | Promise<B>): Promise<B>;
export function pipe<A, B, C>(...args: [...Parameters<typeof pipe<A, B>>, (b: B) => C | Promise<C>]): Promise<C>;
export function pipe<A, B, C, D>(...args: [...Parameters<typeof pipe<A, B, C>>, (c: C) => D | Promise<D>]): Promise<D>;
export function pipe<A, B, C, D, E>(
    ...args: [...Parameters<typeof pipe<A, B, C, D>>, (d: D) => E | Promise<E>]
): Promise<E>;
export function pipe<A, B, C, D, E, F>(
    ...args: [...Parameters<typeof pipe<A, B, C, D, E>>, (e: E) => F | Promise<F>]
): Promise<F>;
export function pipe<A, B, C, D, E, F, G>(
    ...args: [...Parameters<typeof pipe<A, B, C, D, E, F>>, (f: F) => G | Promise<G>]
): Promise<G>;
export function pipe<A, B, C, D, E, F, G, H>(
    ...args: [...Parameters<typeof pipe<A, B, C, D, E, F, G>>, (g: G) => H | Promise<H>]
): Promise<H>;
export function pipe<A, B, C, D, E, F, G, H, I>(
    ...args: [...Parameters<typeof pipe<A, B, C, D, E, F, G, H>>, (h: H) => I | Promise<I>]
): Promise<I>;
export function pipe<A, B, C, D, E, F, G, H, I, J>(
    ...args: [...Parameters<typeof pipe<A, B, C, D, E, F, G, H, I>>, (i: I) => J | Promise<J>]
): Promise<J>;
export function pipe<A, B, C, D, E, F, G, H, I, J, K>(
    ...args: [...Parameters<typeof pipe<A, B, C, D, E, F, G, H, I, J>>, (j: J) => K | Promise<K>]
): Promise<K>;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L>(
    ...args: [...Parameters<typeof pipe<A, B, C, D, E, F, G, H, I, J, K>>, (k: K) => L | Promise<L>]
): Promise<L>;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M>(
    ...args: [...Parameters<typeof pipe<A, B, C, D, E, F, G, H, I, J, K, L>>, (l: L) => M | Promise<M>]
): Promise<M>;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N>(
    ...args: [...Parameters<typeof pipe<A, B, C, D, E, F, G, H, I, J, K, L, M>>, (m: M) => N | Promise<N>]
): Promise<N>;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(
    ...args: [...Parameters<typeof pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N>>, (n: N) => O | Promise<O>]
): Promise<O>;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(
    ...args: [...Parameters<typeof pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>>, (o: O) => P | Promise<P>]
): Promise<P>;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(
    ...args: [...Parameters<typeof pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>>, (p: P) => Q | Promise<Q>]
): Promise<Q>;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(
    ...args: [...Parameters<typeof pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>>, (Q: Q) => R | Promise<R>]
): Promise<R>;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(
    ...args: [
        ...Parameters<typeof pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>>,
        (r: R) => S | Promise<S>,
    ]
): Promise<S>;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>(
    ...args: [
        ...Parameters<typeof pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>>,
        (s: S) => T | Promise<T>,
    ]
): Promise<T>;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U>(
    ...args: [
        ...Parameters<typeof pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>>,
        (t: T) => U | Promise<U>,
    ]
): Promise<U>;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V>(
    ...args: [
        ...Parameters<typeof pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U>>,
        (u: U) => V | Promise<V>,
    ]
): Promise<V>;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W>(
    ...args: [
        ...Parameters<typeof pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V>>,
        (v: V) => W | Promise<W>,
    ]
): Promise<W>;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X>(
    ...args: [
        ...Parameters<typeof pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W>>,
        (w: W) => X | Promise<X>,
    ]
): Promise<X>;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y>(
    ...args: [
        ...Parameters<typeof pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X>>,
        (x: X) => Y | Promise<Y>,
    ]
): Promise<Y>;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z>(
    ...args: [
        ...Parameters<typeof pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y>>,
        (y: Y) => Z | Promise<Z>,
    ]
): Promise<Z>;
export function pipe(value: unknown, ...fns: ((v: unknown) => unknown | Promise<unknown>)[]): Promise<unknown> {
    return _pipe(value, ...fns);
}

async function _pipe(value: unknown, ...fns: ((v: unknown) => unknown | Promise<unknown>)[]): Promise<unknown> {
    for (const fn of fns) {
        value = await fn(value);
    }
    return value;
}
