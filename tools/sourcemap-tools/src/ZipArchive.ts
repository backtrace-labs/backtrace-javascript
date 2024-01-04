import { TransformOptions } from 'stream';
import tar from 'tar-stream';
import zlib from 'zlib';

export class ZipArchive {
    private readonly _pack: tar.Pack;
    private readonly _gz: zlib.Gzip;

    constructor(opts?: TransformOptions) {
        this._pack = tar.pack(opts);
        this._gz = zlib.createGzip();

        this._pack.pipe(this._gz);
    }

    public get stream() {
        return this._gz;
    }

    public append(name: string, sourceMap: string) {
        this._pack.entry({ name }, sourceMap);
        return this;
    }

    public finalize() {
        this._pack.finalize();

        return new Promise<ZipArchive>((resolve, reject) => {
            this._gz.on('finish', () => resolve(this));
            this._gz.on('error', reject);
        });
    }
}
