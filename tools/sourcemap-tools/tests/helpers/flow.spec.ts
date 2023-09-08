import { flow, pipe } from '../../src/helpers/flow';

const increment = (a: number) => ++a;
const incrementAsync = (a: number) => new Promise<number>((resolve) => setImmediate(() => resolve(++a)));

const multiplyBy2 = (a: number) => a * 2;
const multiplyBy2Async = (a: number) => new Promise<number>((resolve) => setImmediate(() => resolve(a * 2)));

describe('flow', () => {
    it('should execute functions in order from first to last', async () => {
        const fn1 = jest.fn(increment);
        const fn2 = jest.fn(incrementAsync);
        const fn3 = jest.fn(increment);

        const fn = flow(fn1, fn2, fn3);
        await fn(0);

        expect(fn1).toBeCalledWith(0);
        expect(fn2).toBeCalledWith(1);
        expect(fn3).toBeCalledWith(2);
    });

    it('should call functions exactly once', async () => {
        const fn1 = jest.fn(increment);
        const fn2 = jest.fn(incrementAsync);
        const fn3 = jest.fn(increment);

        const fn = flow(fn1, fn2, fn3);
        await fn(0);

        expect(fn1).toBeCalledTimes(1);
        expect(fn2).toBeCalledTimes(1);
        expect(fn3).toBeCalledTimes(1);
    });

    it('should return result from function flow', async () => {
        const fn1 = jest.fn(multiplyBy2);
        const fn2 = jest.fn(multiplyBy2Async);
        const fn3 = jest.fn(multiplyBy2);

        const fn = flow(fn1, fn2, fn3);
        const result = await fn(2);

        expect(result).toEqual(2 ** 4);
    });
});

describe('pipe', () => {
    it('should execute functions in order from first to last', async () => {
        const fn1 = jest.fn(increment);
        const fn2 = jest.fn(incrementAsync);
        const fn3 = jest.fn(increment);

        await pipe(0, fn1, fn2, fn3);

        expect(fn1).toBeCalledWith(0);
        expect(fn2).toBeCalledWith(1);
        expect(fn3).toBeCalledWith(2);
    });

    it('should call functions exactly once', async () => {
        const fn1 = jest.fn(increment);
        const fn2 = jest.fn(incrementAsync);
        const fn3 = jest.fn(increment);

        await pipe(0, fn1, fn2, fn3);

        expect(fn1).toBeCalledTimes(1);
        expect(fn2).toBeCalledTimes(1);
        expect(fn3).toBeCalledTimes(1);
    });

    it('should return result from function flow', async () => {
        const fn1 = jest.fn(multiplyBy2);
        const fn2 = jest.fn(multiplyBy2Async);
        const fn3 = jest.fn(multiplyBy2);

        const result = await pipe(2, fn1, fn2, fn3);

        expect(result).toEqual(2 ** 4);
    });
});
