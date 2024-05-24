function stringifiedSize<T>(value: T): number {
    return JSON.stringify(value).length;
}

function toStringSize<T extends { toString(): string }>(value: T): number {
    return value.toString().length;
}

const stringSize = (value: string) => stringifiedSize(value);
const numberSize = toStringSize<number>;
const bigintSize = toStringSize<bigint>;
const symbolSize = 0;
const functionSize = 0;
const booleanSize = (value: boolean) => (value ? 4 : 5);
const undefinedSize = 0;
const nullSize = 'null'.length;

function arraySize(array: unknown[], replacer?: (this: unknown, key: string, value: unknown) => unknown): number {
    const bracketLength = 2;
    const commaLength = array.length - 1;
    let elementsLength = 0;
    for (let i = 0; i < array.length; i++) {
        const element = array[i];
        switch (typeof element) {
            case 'function':
            case 'symbol':
            case 'undefined':
                elementsLength += nullSize;
                break;
            default:
                elementsLength += _jsonSize(array, i.toString(), element, replacer);
        }
    }

    return bracketLength + commaLength + elementsLength;
}

const objectSize = (obj: object, replacer?: (this: unknown, key: string, value: unknown) => unknown): number => {
    let jsonObject: object;
    if ('toJSON' in obj && typeof obj.toJSON === 'function') {
        jsonObject = obj.toJSON() as object;
    } else {
        jsonObject = obj;
    }

    const entries = Object.entries(jsonObject);
    const bracketLength = 2;

    let entryCount = 0;
    let entriesLength = 0;

    for (const [k, v] of entries) {
        const valueSize = _jsonSize(obj, k, v, replacer);
        if (valueSize === 0) {
            continue;
        }

        entryCount++;
        entriesLength += keySize(k) + valueSize + 1;
    }

    const commaLength = Math.max(0, entryCount - 1);

    return bracketLength + commaLength + entriesLength;
};

function keySize(key: unknown): number {
    const QUOTE_SIZE = 2;

    if (key === null) {
        return nullSize + QUOTE_SIZE;
    } else if (key === undefined) {
        return '"undefined"'.length;
    }

    switch (typeof key) {
        case 'string':
            return stringSize(key);
        case 'number':
            return numberSize(key) + QUOTE_SIZE;
        case 'boolean':
            return booleanSize(key) + QUOTE_SIZE;
        case 'symbol':
            return 0; // key not used in JSON
        default:
            return stringSize(key.toString());
    }
}

function _jsonSize(
    parent: unknown,
    key: string,
    value: unknown,
    replacer?: (this: unknown, key: string, value: unknown) => unknown,
): number {
    value = replacer ? replacer.call(parent, key, value) : value;
    if (value === null) {
        return nullSize;
    } else if (value === undefined) {
        return undefinedSize;
    }

    if (Array.isArray(value)) {
        return arraySize(value, replacer);
    }

    switch (typeof value) {
        case 'bigint':
            return bigintSize(value);
        case 'boolean':
            return booleanSize(value);
        case 'function':
            return functionSize;
        case 'number':
            return numberSize(value);
        case 'object':
            return objectSize(value, replacer);
        case 'string':
            return stringSize(value);
        case 'symbol':
            return symbolSize;
        case 'undefined':
            return undefinedSize;
    }

    return 0;
}

/**
 * Calculates size of the object as it would be serialized into JSON.
 *
 * _Should_ return the same value as `JSON.stringify(value, replacer).length`.
 * This may not be 100% accurate, but should work for our requirements.
 * @param value Value to compute length for.
 * @param replacer A function that transforms the results as in `JSON.stringify`.
 * @returns Final string length.
 */
export function jsonSize(value: unknown, replacer?: (this: unknown, key: string, value: unknown) => unknown): number {
    return _jsonSize(undefined, '', value, replacer);
}
