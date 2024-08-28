export type Mocked<T> = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [K in keyof T]: T[K] extends (...args: any) => any ? jest.Mock<ReturnType<T[K]>, Parameters<T[K]>> : never;
};
