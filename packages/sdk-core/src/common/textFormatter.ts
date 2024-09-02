import { jsonEscaper } from './jsonEscaper.js';

export function textFormatter(): (...params: unknown[]) => string {
    const defaultFormatter = fallbackFormatter(jsonEscaper());
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const util = require('util');
        return util.format ?? defaultFormatter;
    } catch {
        return defaultFormatter;
    }
}

function fallbackFormatter(jsonEscapeFunction: (this: unknown, key: string, value: unknown) => unknown) {
    return function fallbackFormatter(...params: unknown[]): string {
        let result = '';
        for (const param of params) {
            result += typeof param === 'object' ? JSON.stringify(param, jsonEscapeFunction) : param?.toString();
        }
        return result;
    };
}
