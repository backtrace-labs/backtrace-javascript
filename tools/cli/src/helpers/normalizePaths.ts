import path from 'path';

export function normalizePaths(paths: string | string[] | undefined): string[] | undefined;
export function normalizePaths(paths: string | string[] | undefined, defaults: string | string[]): string[];
export function normalizePaths(paths: string | string[] | undefined, defaults?: string | string[]) {
    if (!paths || !paths.length) {
        return defaults ? toArray(defaults) : undefined;
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
