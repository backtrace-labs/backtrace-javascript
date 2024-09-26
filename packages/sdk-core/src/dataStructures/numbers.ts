export type ConstrainedNumber = (value: number) => number;

/**
 * Constrains `value` to `min` and `max` values, wrapping not matching values around.
 * @param min minimum value to allow
 * @param max maximum value to allow
 * @returns function accepting `value`
 *
 * @example
 * const wrap = wrapped(10, 20);
 * console.log(wrap(15)); // 15
 * console.log(wrap(21)); // 10, wrapped around
 * console.log(wrap(8)); // 18, wrapped around
 */
export function wrapped(min: number, max: number): ConstrainedNumber {
    function wrapped(value: number) {
        const range = max - min;
        let newValue: number;
        if (value < min) {
            newValue = max - ((min - value) % range);
            if (newValue === max) {
                newValue = min;
            }
        } else if (value >= max) {
            newValue = min + ((value - max) % range);
            if (newValue === max) {
                newValue = min;
            }
        } else {
            newValue = value;
        }
        return newValue;
    }

    return wrapped;
}

/**
 * Constrains `value` to `min` and `max` values.
 * @param min minimum value to allow
 * @param max maximum value to allow
 * @returns function accepting `value`
 *
 * @example
 * const clamp = clamped(10, 20);
 * console.log(wrap(15)); // 15
 * console.log(wrap(21)); // 20
 * console.log(wrap(8)); // 10
 */
export function clamped(min: number, max: number): ConstrainedNumber {
    function clamped(value: number) {
        return Math.max(min, Math.min(value, max));
    }

    return clamped;
}
