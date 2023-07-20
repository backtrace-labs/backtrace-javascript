/**
 * Appends `value` to `str` before trailing whitespaces in `str`.
 * @param str String to append to.
 * @param value String to append.
 * @example
 * const str = 'abc\n\n';
 * const value = 'def';
 * const appended = appendBeforeWhitespaces(str, value);
 */
export function appendBeforeWhitespaces(str: string, value: string) {
    const whitespaces = str.match(/\s*$/)?.[0];
    if (!whitespaces) {
        return str + value;
    }

    return str.substring(0, str.length - whitespaces.length) + value + whitespaces;
}
