export function normalizePaths(paths: string | string[] | undefined, defaults: string | string[]) {
    if (!paths || !paths.length) {
        return toArray(defaults);
    }

    return toArray(paths);
}

function toArray<T>(t: T | T[]) {
    if (Array.isArray(t)) {
        return t;
    }

    return [t];
}
