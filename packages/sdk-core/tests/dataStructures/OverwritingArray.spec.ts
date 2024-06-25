import { OverwritingArray } from '../../src/dataStructures/OverwritingArray';

describe('OverwritingArray', () => {
    describe('push', () => {
        it('should add elements to array', () => {
            const array = new OverwritingArray(5);
            array.push(1, 2, 3);

            expect([...array]).toEqual([1, 2, 3]);
        });

        it('should overwrite first elements after adding more than capacity', () => {
            const array = new OverwritingArray(5);
            array.push(1, 2, 3, 4, 5, 6, 7, 8);

            expect([...array]).toEqual([4, 5, 6, 7, 8]);
        });
    });

    describe('at', () => {
        it('should return element at index', () => {
            const array = new OverwritingArray(5);
            array.push(1, 2, 3);

            const actual = array.at(1);
            expect(actual).toEqual(2);
        });

        it('should return element at index of overwritten array', () => {
            const array = new OverwritingArray(5);
            array.push(1, 2, 3, 4, 5, 6, 7, 8);

            const actual = array.at(1);
            expect(actual).toEqual(5);
        });
    });

    describe('shift', () => {
        it('should remove element from start of array', () => {
            const array = new OverwritingArray(5);
            array.push(1, 2, 3);
            array.shift();

            expect([...array]).toEqual([2, 3]);
        });

        it('should remove element from start of overwritten array', () => {
            const array = new OverwritingArray(5);
            array.push(1, 2, 3, 4, 5, 6, 7, 8);
            array.shift();

            expect([...array]).toEqual([5, 6, 7, 8]);
        });

        it('should return removed element', () => {
            const array = new OverwritingArray(5);
            array.push(1, 2, 3);
            const actual = array.shift();

            expect(actual).toEqual(1);
        });

        it('should return removed element from overwritten array', () => {
            const array = new OverwritingArray(5);
            array.push(1, 2, 3, 4, 5, 6, 7, 8);
            const actual = array.shift();

            expect(actual).toEqual(4);
        });
    });

    describe('pop', () => {
        it('should remove element from end of array', () => {
            const array = new OverwritingArray(5);
            array.push(1, 2, 3);
            array.pop();

            expect([...array]).toEqual([1, 2]);
        });

        it('should remove element from end of overwritten array', () => {
            const array = new OverwritingArray(5);
            array.push(1, 2, 3, 4, 5, 6, 7, 8);
            array.pop();

            expect([...array]).toEqual([4, 5, 6, 7]);
        });

        it('should return removed element', () => {
            const array = new OverwritingArray(5);
            array.push(1, 2, 3);
            const actual = array.pop();

            expect(actual).toEqual(3);
        });

        it('should return removed element from overwritten array', () => {
            const array = new OverwritingArray(5);
            array.push(1, 2, 3, 4, 5, 6, 7, 8);
            const actual = array.pop();

            expect(actual).toEqual(8);
        });
    });

    describe('values', () => {
        it('should iterate values', () => {
            const array = new OverwritingArray(5, [1, 2, 3, 4, 5, 6, 7, 8]);
            expect([...array.values()]).toEqual([4, 5, 6, 7, 8]);
        });
    });

    describe('keys', () => {
        it('should iterate keys', () => {
            const array = new OverwritingArray(5, [1, 2, 3, 4, 5, 6, 7, 8]);
            expect([...array.keys()]).toEqual([0, 1, 2, 3, 4]);
        });
    });

    describe('entries', () => {
        it('should iterate entries', () => {
            const array = new OverwritingArray(5, [1, 2, 3, 4, 5, 6, 7, 8]);
            expect([...array.entries()]).toEqual([
                [0, 4],
                [1, 5],
                [2, 6],
                [3, 7],
                [4, 8],
            ]);
        });
    });
});
