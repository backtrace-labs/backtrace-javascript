import { Ok, Result, SymbolUploader, UploadResult } from '@backtrace/sourcemap-tools';
import path from 'path';
import { Transform } from 'stream';

export function getHelpMessage() {
    return '';
}

export function mockUploader(rxid = 'rxid') {
    return jest.spyOn(SymbolUploader.prototype, 'createUploadRequest').mockImplementation(() => {
        const request = new Transform({
            transform(_, __, callback) {
                callback();
            },
        });

        const promise = new Promise<Result<UploadResult, string>>((resolve) => {
            request.on('finish', () => resolve(Ok({ rxid })));
        });

        return { request, promise };
    });
}

export function filterKeys<T extends Record<string, unknown>>(obj: T, predicate: (key: string) => boolean) {
    return Object.fromEntries(
        Object.keys(obj)
            .filter(predicate)
            .map((k) => [k, obj[k]]),
    );
}

export function expectAllKeysToChange<T extends Record<string, unknown>>(obj1: T, obj2: T) {
    for (const key in obj1) {
        const value1 = obj1[key];
        const value2 = obj2[key];

        expect(value1).not.toEqual(value2);
    }
}

export function expectSamePaths(actual: string[], expected: string[]) {
    const actualAbsolute = actual.map((p) => path.resolve(p));
    const expectedAbsolute = expected.map((p) => path.resolve(p));

    expect(actualAbsolute).toEqual(expect.arrayContaining(expectedAbsolute));
}

export function pathTuple(a: string, b: string) {
    if (process.platform === 'win32') {
        return `${a}::${b}`;
    } else {
        return `${a}:${b}`;
    }
}
