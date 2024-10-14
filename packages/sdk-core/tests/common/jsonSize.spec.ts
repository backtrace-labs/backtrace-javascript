/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { jsonEscaper } from '../../src/common/jsonEscaper.js';
import { jsonSize } from '../../src/common/jsonSize.js';

describe('jsonSize', () => {
    it('should compute string size', () => {
        const value = 'foo\n\t\rbar""\'\'```123';
        const expected = JSON.stringify(value).length;

        const actual = jsonSize(value);
        expect(actual).toEqual(expected);
    });

    it('should compute number size', () => {
        const value = 34534134.24875381;
        const expected = JSON.stringify(value).length;

        const actual = jsonSize(value);
        expect(actual).toEqual(expected);
    });

    it('should compute boolean true size', () => {
        const value = true;
        const expected = JSON.stringify(value).length;

        const actual = jsonSize(value);
        expect(actual).toEqual(expected);
    });

    it('should compute boolean false size', () => {
        const value = true;
        const expected = JSON.stringify(value).length;

        const actual = jsonSize(value);
        expect(actual).toEqual(expected);
    });

    it('should compute bigint size', () => {
        const value = BigInt('32785893475875872652349587624379564329785674325692483657894236597436279586342978563');
        const expected = value.toString().length;

        const actual = jsonSize(value);
        expect(actual).toEqual(expected);
    });

    it('should compute symbol size', () => {
        const value = Symbol.for('foobar');
        const expected = JSON.stringify(value)?.length ?? 0;

        const actual = jsonSize(value);
        expect(actual).toEqual(expected);
    });

    it('should compute function size', () => {
        const value = function (arg1: number) {
            return arg1;
        };

        const expected = JSON.stringify(value)?.length ?? 0;

        const actual = jsonSize(value);
        expect(actual).toEqual(expected);
    });

    it('should compute undefined size', () => {
        const value = undefined;
        const expected = JSON.stringify(value)?.length ?? 0;

        const actual = jsonSize(value);
        expect(actual).toEqual(expected);
    });

    it('should compute null size', () => {
        const value = null;
        const expected = JSON.stringify(value)?.length ?? 0;

        const actual = jsonSize(value);
        expect(actual).toEqual(expected);
    });

    describe('objects with values', () => {
        it('should compute object size with number value', () => {
            const value = {
                num: 123,
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with number key', () => {
            const value = {
                [123]: '123',
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with string value', () => {
            const value = {
                string: 'str',
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with true value', () => {
            const value = {
                true: true,
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with true key', () => {
            const value = {
                [true as never]: 'true',
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with false value', () => {
            const value = {
                false: false,
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with false key', () => {
            const value = {
                [false as never]: 'false',
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with null value', () => {
            const value = {
                null: null,
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with null key', () => {
            const value = {
                [null as never]: 'null',
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with undefined value', () => {
            const value = {
                undefined: undefined,
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with undefined key', () => {
            const value = {
                [undefined as never]: 'undefined',
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with symbol value', () => {
            const value = {
                symbol: Symbol.for('key'),
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with symbol key', () => {
            const value = {
                [Symbol.for('key')]: 'symbol',
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with function value', () => {
            const value = {
                fun: (arg: number) => {},
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with function key', () => {
            const value = {
                [((arg: number) => {}) as never]: 'fun',
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with array value', () => {
            const value = {
                array: ['element'],
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with array key', () => {
            const value = {
                [['element'] as never]: 'array',
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with object value', () => {
            const value = {
                obj: { foo: 'bar' },
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with object key', () => {
            const value = {
                [{ foo: 'bar' } as never]: 'object',
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with multiple keys', () => {
            const value = {
                key1: 'key1',
                key2: 'key2',
                key3: 'key3',
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with no keys', () => {
            const value = {};

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with toJSON function', () => {
            const value = {
                a: 123,
                b: 'xyz',
                toJSON() {
                    return {
                        foo: 'bar',
                    };
                },
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with Date value', () => {
            const value = {
                date: new Date(),
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute object size with every key type', () => {
            const value = {
                num: 123,
                [123]: '123',
                string: 'str',
                true: true,
                [true as never]: 'true',
                false: false,
                [false as never]: 'false',
                null: null,
                [null as never]: 'null',
                undefined: undefined,
                [undefined as never]: 'undefined',
                symbol: Symbol.for('key'),
                [Symbol.for('key')]: 'symbol',
                fun: (arg: number) => {},
                [((arg: number) => {}) as never]: 'fun',
                array: ['element'],
                [['element'] as never]: 'array',
                obj: { foo: 'bar' },
                [{ foo: 'bar' } as never]: 'object',
            };

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });
    });

    describe('arrays with values', () => {
        it('should compute array size with number value', () => {
            const value = [123];

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute array size with string value', () => {
            const value = ['str'];

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute array size with true value', () => {
            const value = [true];

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute array size with false value', () => {
            const value = [false];

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute array size with null value', () => {
            const value = [null];

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute array size with undefined value', () => {
            const value = [undefined];

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute array size with symbol value', () => {
            const value = [Symbol.for('symbol')];

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute array size with function value', () => {
            const value = [(arg: number) => {}];

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute array size with array value', () => {
            const value = [['123']];

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute array size with object value', () => {
            const value = [{ foo: 'bar' }];

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute array size with multiple values', () => {
            const value = ['el1', 'el2', 'el3'];

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute array size with Date value', () => {
            const value = [new Date()];

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });

        it('should compute array size with every value type', () => {
            const value = [
                123,
                'str',
                true,
                false,
                null,
                undefined,
                new Date(),
                Symbol.for('symbol'),
                (arg: number) => {},
                ['123'],
                { foo: 'bar' },
            ];

            const expected = JSON.stringify(value).length;

            const actual = jsonSize(value);
            expect(actual).toEqual(expected);
        });
    });

    describe('circular references', () => {
        it('should compute object size for self-referencing object', () => {
            const value = {
                a: {
                    b: {
                        c: undefined as object | undefined,
                    },
                },
            };

            value.a.b.c = value;

            const expected = JSON.stringify(value, jsonEscaper()).length;
            const actual = jsonSize(value, jsonEscaper());

            expect(actual).toEqual(expected);
        });

        it('should compute array size for self-referencing array', () => {
            const value: unknown[] = ['a', 'b', 'c'];
            value.push(value);

            const expected = JSON.stringify(value, jsonEscaper()).length;
            const actual = jsonSize(value, jsonEscaper());

            expect(actual).toEqual(expected);
        });

        it('should compute object size for self-referencing object with toJSON', () => {
            const value = {
                a: {
                    b: {
                        toJSON() {
                            return value;
                        },
                    },
                },
            };

            const expected = JSON.stringify(value, jsonEscaper()).length;
            const actual = jsonSize(value, jsonEscaper());

            expect(actual).toEqual(expected);
        });
    });
});
