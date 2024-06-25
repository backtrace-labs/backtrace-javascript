export type ConstrainedNumber = (value: number) => number;

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

export function clamped(min: number, max: number): ConstrainedNumber {
    function clamped(value: number) {
        return Math.max(min, Math.min(value, max));
    }

    return clamped;
}
