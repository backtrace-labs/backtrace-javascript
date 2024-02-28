type DeepPartial<T extends object> = Partial<{ [K in keyof T]: T[K] extends object ? DeepPartial<T[K]> : T[K] }>;

const REMOVED_PLACEHOLDER = '<removed>';

export type Limited<T extends object> = DeepPartial<T> | typeof REMOVED_PLACEHOLDER;

export function limitObjectDepth<T extends object>(obj: T, depth: number): Limited<T> {
    if (!(depth < Infinity)) {
        return obj;
    }

    if (depth < 0) {
        return REMOVED_PLACEHOLDER;
    }

    const limitIfObject = (value: unknown) =>
        typeof value === 'object' && value ? limitObjectDepth(value, depth - 1) : value;

    const result: DeepPartial<T> = {};
    for (const key in obj) {
        const value = obj[key];
        if (Array.isArray(value)) {
            result[key] = value.map(limitIfObject) as never;
        } else {
            result[key] = limitIfObject(value) as never;
        }
    }

    return result;
}
