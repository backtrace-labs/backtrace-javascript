import { OverwritingArrayIterator } from './OverwritingArrayIterator.js';

export class OverwritingArray<T> {
    private _array: T[];
    private _index = 0;
    private _size = 0;
    private _startIndex = 0;
    constructor(public readonly capacity: number) {
        this._array = this.createArray();
    }
    public add(value: T): this {
        this._array[this._index] = value;
        this._index = this.incrementIndex(this._index);
        this._startIndex = this.incrementStartingIndex();
        this._size = this.incrementSize();
        return this;
    }

    public clear(): void {
        this._array = this.createArray();
    }

    public values(): IterableIterator<T> {
        return new OverwritingArrayIterator<T>(this._array, this._startIndex, this._size);
    }

    [Symbol.iterator](): IterableIterator<T> {
        return new OverwritingArrayIterator<T>(this._array, this._startIndex, this._size);
    }

    private incrementIndex(index: number) {
        return (index + 1) % this.capacity;
    }

    private incrementStartingIndex() {
        if (this._size !== this.capacity) {
            return this._startIndex;
        }
        return this.incrementIndex(this._startIndex);
    }
    private incrementSize() {
        return Math.min(this.capacity, this._size + 1);
    }
    private createArray() {
        return new Array(this.capacity);
    }
}
