export function single<T, A extends any[]>(fn: (...args: A) => T) {
    let called = false;
    let result: T | undefined;
    return (...args: A) => {
        if (called) {
            return result as T;
        }

        called = true;
        result = fn(...args);
        return result;
    };
}
