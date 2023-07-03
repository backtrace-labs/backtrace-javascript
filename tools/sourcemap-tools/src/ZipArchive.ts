import archiver from 'archiver';
import { Readable, Transform, TransformCallback, TransformOptions } from 'stream';

export class ZipArchive extends Transform {
    private readonly _archive: archiver.Archiver;

    constructor(opts?: TransformOptions) {
        super(opts);
        this._archive = archiver('zip');
    }

    public append(name: string, sourceMap: string | Readable | Buffer) {
        this._archive.append(sourceMap, { name });
        return this;
    }

    public finalize() {
        return this._archive.finalize();
    }

    public override pipe<T extends NodeJS.WritableStream>(
        destination: T,
        options?: { end?: boolean | undefined } | undefined,
    ): T {
        return this._archive.pipe(destination, options);
    }

    public override _transform(chunk: unknown, encoding: BufferEncoding, callback: TransformCallback): void {
        return this._archive._transform(chunk, encoding, callback);
    }

    public override _flush(callback: TransformCallback): void {
        return this._archive._flush(callback);
    }
}
