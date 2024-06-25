import { ConstrainedNumber, clamped, wrapped } from './numbers.js';

export class OverwritingArray<T> {
    private _array: T[];

    private readonly _headConstraint: ConstrainedNumber;
    private readonly _lengthConstraint: ConstrainedNumber;

    private _head = 0;
    private _length = 0;

    private get head() {
        return this._head;
    }

    private set head(value: number) {
        this._head = this._headConstraint(value);
    }

    public get length() {
        return this._length;
    }

    public set length(value: number) {
        this._length = this._lengthConstraint(value);
    }

    private get start() {
        return this._headConstraint(this.head - this.length);
    }

    constructor(
        public readonly capacity: number,
        items?: T[],
    ) {
        this._array = new Array(capacity);
        this._headConstraint = wrapped(0, capacity);
        this._lengthConstraint = clamped(0, capacity);

        if (items) {
            this.push(...items);
        }
    }

    public add(item: T) {
        return this.pushOne(item);
    }

    public push(...items: T[]): number {
        for (const item of items) {
            this.pushOne(item);
        }
        return this.length;
    }

    public pop(): T | undefined {
        this.head--;
        const element = this._array[this.head];
        this._array[this.head] = undefined as never;
        this.length--;
        return element;
    }

    public shift(): T | undefined {
        const element = this._array[this.start];
        this._array[this.start] = undefined as never;
        this.length--;
        return element;
    }

    public at(index: number): T | undefined {
        return this._array[this.index(index)];
    }

    public *values(): IterableIterator<T> {
        for (let i = 0; i < this.length; i++) {
            const index = this.index(i);
            yield this._array[index];
        }
    }

    public *keys(): IterableIterator<number> {
        for (let i = 0; i < this.length; i++) {
            yield i;
        }
    }

    public *entries(): IterableIterator<[number, T]> {
        for (let i = 0; i < this.length; i++) {
            const index = this.index(i);
            yield [i, this._array[index]];
        }
    }

    public [Symbol.iterator]() {
        return this.values();
    }

    private pushOne(item: T) {
        this._array[this.head] = item;
        this.head++;
        this.length++;
    }

    private index(value: number) {
        if (!this.length) {
            return this._headConstraint(value);
        }

        const index = (value % this.length) + this.start;
        return this._headConstraint(index);
    }
}
