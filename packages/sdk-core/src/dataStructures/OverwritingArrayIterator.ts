export class OverwritingArrayIterator<T> implements IterableIterator<T> {
    private _index?: number;

    constructor(private readonly _source: T[], private readonly _offset: number, private readonly _size: number) {}

    [Symbol.iterator](): IterableIterator<T> {
        return new OverwritingArrayIterator(this._source, this._offset, this._size);
    }
    next(): IteratorResult<T> {
        if (this._index === undefined) {
            this._index = 0;
        } else if (this._index === this._size - 1) {
            return {
                done: true,
                value: undefined,
            };
        } else {
            this._index++;
        }
        return {
            done: false,
            value: this._source[(this._index + this._offset) % this._size],
        };
    }
}
