import { ContentAppender } from '../src';

describe('ContentAppender', () => {
    describe('appendToJSON', () => {
        it('should return a parseable object', () => {
            const obj = {
                a: '123',
                b: '456',
            };

            const keyValues = {
                x: 'x',
                y: 123,
                z: true,
            };

            const contentAppender = new ContentAppender();
            const actual = contentAppender.appendToJSON(JSON.stringify(obj), keyValues);

            expect(() => JSON.parse(actual)).not.toThrow();
        });

        it('should return an object with new key values', () => {
            const obj = {
                a: '123',
                b: '456',
            };

            const keyValues = {
                x: 'x',
                y: 123,
                z: true,
            };

            const contentAppender = new ContentAppender();
            const actual = contentAppender.appendToJSON(JSON.stringify(obj), keyValues);

            expect(JSON.parse(actual)).toMatchObject(keyValues);
        });

        it('should return an object with old key values', () => {
            const obj = {
                a: '123',
                b: '456',
            };

            const keyValues = {
                x: 'x',
                y: 123,
                z: true,
            };

            const contentAppender = new ContentAppender();
            const actual = contentAppender.appendToJSON(JSON.stringify(obj), keyValues);

            expect(JSON.parse(actual)).toMatchObject(obj);
        });

        it('should return an object with old and new key values', () => {
            const obj = {
                a: '123',
                b: '456',
            };

            const keyValues = {
                x: 'x',
                y: 123,
                z: true,
            };

            const expected = {
                ...obj,
                ...keyValues,
            };

            const contentAppender = new ContentAppender();
            const actual = contentAppender.appendToJSON(JSON.stringify(obj), keyValues);

            expect(JSON.parse(actual)).toMatchObject(expected);
        });

        it('should return an object with old and new key values with whitespaces at the end of JSON', () => {
            const obj = {
                a: '123',
                b: '456',
            };

            const keyValues = {
                x: 'x',
                y: 123,
                z: true,
            };

            const expected = {
                ...obj,
                ...keyValues,
            };

            const contentAppender = new ContentAppender();
            const actual = contentAppender.appendToJSON(JSON.stringify(obj) + '   \n\n   \n\t', keyValues);

            expect(JSON.parse(actual)).toMatchObject(expected);
        });

        it('should not remove whitespaces at the end of JSON', () => {
            const expected = '   \n\n   \n\t';
            const json =
                JSON.stringify({
                    a: '123',
                    b: '456',
                }) + expected;

            const contentAppender = new ContentAppender();
            const actual = contentAppender.appendToJSON(json, { x: true });

            expect(actual).toMatch(new RegExp(expected + '$'));
        });
    });
});
