import { jsonEscaper } from './jsonEscaper';

export function textFormatter(): (...params: unknown[]) => string {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const util = require('util');
        return util.format;
    } catch {
        return fallbackFormatter;
    }
}

function fallbackFormatter(...params: unknown[]): string {
    let result = '';
    for (const param of params) {
        result += typeof param === 'object' ? JSON.stringify(param, jsonEscaper()) : param?.toString();
    }
    return result;
}
