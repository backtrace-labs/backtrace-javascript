import zlib from 'node:zlib';
import { TransformOptions } from 'stream';
import tar from 'tar-stream';

export class ZipArchive {
    private readonly _pack: tar.Pack;
    private readonly _gz: zlib.Gzip;

    constructor(opts?: TransformOptions) {
        this._pack = tar.pack(opts);
        this._gz = zlib.createGzip();

        this._pack.pipe(this._gz);
    }

    public async append(name: string, sourceMap: string) {
        this._pack.entry({ name }, sourceMap);
        return this;
    }

    public finalize() {
        this._pack.finalize();

        return new Promise<ZipArchive>((resolve, reject) => {
            this._gz.on('close', () => resolve(this));
            this._gz.on('error', reject);
        });
    }

    public on(event: string, listener: (...args: unknown[]) => void): this {
        this._pack.on(event, listener);
        return this;
    }

    public pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T {
        return this._gz.pipe(destination, options);
    }
}
