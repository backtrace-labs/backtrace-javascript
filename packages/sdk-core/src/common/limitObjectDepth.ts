type DeepPartial<T extends object> = Partial<{ [K in keyof T]: T[K] extends object ? DeepPartial<T[K]> : T[K] }>;

const REMOVED_PLACEHOLDER = '<removed>';

export type Limited<T> = (T extends object ? DeepPartial<T> : T) | typeof REMOVED_PLACEHOLDER;

export function limitObjectDepth<T>(val: T, depth: number): Limited<T> {
    if (typeof val !== 'object' || !val) {
        return val as Limited<T>;
    }

    if (!(depth < Infinity)) {
        return val as Limited<T>;
    }

    if (depth < 0) {
        return REMOVED_PLACEHOLDER;
    }

    try {
        if ('toJSON' in val && typeof val.toJSON === 'function') {
            return limitObjectDepth(val.toJSON(), depth - 1);
        }
    } catch (err) {
        if (err instanceof TypeError) {
            return REMOVED_PLACEHOLDER;
        }
        // broken toJSON — fall through to iterate own properties
    }

    const limitChild = (value: unknown) => limitObjectDepth(value, depth - 1);

    const result: DeepPartial<T & object> = {};
    for (const key in val) {
        try {
            const value = val[key];
            if (Array.isArray(value)) {
                result[key] = value.map(limitChild) as never;
            } else {
                result[key] = limitChild(value) as never;
            }
        } catch {
            // catch revoked proxies and other broken objects
            result[key] = REMOVED_PLACEHOLDER as never;
        }
    }

    return result as Limited<T>;
}
