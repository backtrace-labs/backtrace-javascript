import path from 'path';

export function normalizePaths(paths: string | string[] | undefined, defaults: string | string[]) {
    if (!paths || !paths.length) {
        return toArray(defaults);
    }

    return toArray(paths);
}

export function relativePaths(paths: string | string[], relative: string) {
    return toArray(paths).map((p) => path.join(relative, p));
}

function toArray<T>(t: T | T[]) {
    if (Array.isArray(t)) {
        return t;
    }

    return [t];
}
