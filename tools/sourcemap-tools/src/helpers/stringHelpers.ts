export function appendBeforeWhitespaces(str: string, value: string) {
    const whitespaces = str.match(/\s*$/)?.[0];
    if (!whitespaces) {
        return str + value;
    }

    return str.substring(0, whitespaces.length) + value + whitespaces;
}
