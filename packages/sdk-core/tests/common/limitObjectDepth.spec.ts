import { limitObjectDepth } from '../../src/common/limitObjectDepth';

const EXPECTED_REMOVED_PLACEHOLDER = '<removed>';

describe('limitObjectDepth', () => {
    it(`should replace object keys below depth with ${EXPECTED_REMOVED_PLACEHOLDER}`, () => {
        const obj = {
            a0: {
                a1: {
                    a2: {
                        foo: 'bar',
                    },
                    b2: 'xyz',
                },
                b1: 'test',
            },
        };

        const depth = 2;
        const expected = {
            a0: {
                a1: {
                    a2: EXPECTED_REMOVED_PLACEHOLDER,
                    b2: 'xyz',
                },
                b1: 'test',
            },
        };

        const actual = limitObjectDepth(obj, depth);
        expect(actual).toEqual(expected);
    });

    it('should replace objects in arrays below depth with <removed>', () => {
        const obj = {
            a0: {
                a1: [{ a2: { foo: 'bar' } }, { b2: 'xyz' }],
                b1: 'test',
                c1: {
                    a2: [
                        {
                            foo: 'baz',
                        },
                        'xyz',
                    ],
                },
            },
        };

        const depth = 2;
        const expected = {
            a0: {
                a1: [{ a2: EXPECTED_REMOVED_PLACEHOLDER }, { b2: 'xyz' }],
                b1: 'test',
                c1: {
                    a2: [EXPECTED_REMOVED_PLACEHOLDER, 'xyz'],
                },
            },
        };

        const actual = limitObjectDepth(obj, depth);
        expect(actual).toEqual(expected);
    });

    it('should not change object if depth is greater than the object max depth', () => {
        const obj = {
            a0: {
                a1: {
                    a2: {
                        foo: 'bar',
                    },
                    b2: 'xyz',
                },
                b1: 'test',
            },
        };

        const depth = 10;

        const actual = limitObjectDepth(obj, depth);
        expect(actual).toEqual(obj);
    });

    it(`should not replace null/undefined with ${EXPECTED_REMOVED_PLACEHOLDER}`, () => {
        const obj = {
            a0: {
                a1: {
                    a2: null,
                    b2: undefined,
                    c2: 'xyz',
                },
                b1: 'test',
            },
        };

        const depth = 2;

        const actual = limitObjectDepth(obj, depth);
        expect(actual).toEqual(obj);
    });

    it('should return the exact same object if depth is Infinity', () => {
        const obj = {
            a0: {
                a1: {
                    a2: null,
                    b2: undefined,
                    c2: 'xyz',
                },
                b1: 'test',
            },
        };

        const actual = limitObjectDepth(obj, Infinity);
        expect(actual).toBe(obj);
    });
});
