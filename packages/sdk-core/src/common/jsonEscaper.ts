export function jsonEscaper() {
    const ancestors: unknown[] = [];
    const keys: string[] = [];

    // in TypeScript add "this: any" param to avoid compliation errors - as follows
    //    return function (this: any, field: any, value: any) {
    return function (this: unknown, key: string, value: unknown) {
        if (value === null) {
            return value;
        }

        const valueType = typeof value;

        if (valueType === 'bigint') {
            return (value as bigint).toString();
        }

        if (valueType !== 'object') {
            return value;
        }

        // `this` is the object that value is contained in,
        // i.e., its direct parent.
        while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
            ancestors.pop();
            keys.pop();
        }
        if (ancestors.includes(value)) {
            return `[Circular].${keys.filter((k) => !!k).join('.')}.${key}`;
        }
        keys.push(key);
        ancestors.push(value);
        return value;
    };
}
