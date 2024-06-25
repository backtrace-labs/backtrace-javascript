import { clamped, wrapped } from '../../src/dataStructures/numbers';

describe('wrapped', () => {
    it('should return set number if between min and max', () => {
        const value = 6;
        const expected = value;

        const constraint = wrapped(-10, 10);
        const actual = constraint(value);

        expect(actual).toEqual(expected);
    });

    it('should return min if set to min', () => {
        const value = -10;
        const expected = -10;

        const constraint = wrapped(-10, 10);
        const actual = constraint(value);

        expect(actual).toEqual(expected);
    });

    it('should return min if set to max', () => {
        const value = 10;
        const expected = -10;

        const constraint = wrapped(-10, 10);
        const actual = constraint(value);

        expect(actual).toEqual(expected);
    });

    it('should return offset value if set not between min and max', () => {
        const value = 15;
        const expected = -5;

        const constraint = wrapped(-10, 10);
        const actual = constraint(value);

        expect(actual).toEqual(expected);
    });
});

describe('clamped', () => {
    it('should return set number if between min and max', () => {
        const value = 6;
        const expected = value;

        const constraint = clamped(-10, 10);
        const actual = constraint(value);

        expect(actual).toEqual(expected);
    });

    it('should return min if set to min', () => {
        const value = -10;
        const expected = -10;

        const constraint = clamped(-10, 10);
        const actual = constraint(value);

        expect(actual).toEqual(expected);
    });

    it('should return max if set to max', () => {
        const value = 10;
        const expected = 10;

        const constraint = clamped(-10, 10);
        const actual = constraint(value);

        expect(actual).toEqual(expected);
    });

    it('should return max value if set to larger than max', () => {
        const value = 15;
        const expected = 10;

        const constraint = clamped(-10, 10);
        const actual = constraint(value);

        expect(actual).toEqual(expected);
    });

    it('should return min value if set to lower than min', () => {
        const value = -15;
        const expected = -10;

        const constraint = clamped(-10, 10);
        const actual = constraint(value);

        expect(actual).toEqual(expected);
    });
});
