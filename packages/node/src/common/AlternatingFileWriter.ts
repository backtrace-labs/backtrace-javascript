import { NodeFileSystem, WritableStream } from '../storage/interfaces/NodeFileSystem.js';

export class AlternatingFileWriter {
    private _fileStream?: WritableStream;
    private _count = 0;
    private _disposed = false;

    constructor(
        private readonly _mainFile: string,
        private readonly _fallbackFile: string,
        private readonly _fileCapacity: number,
        private readonly _fileSystem: NodeFileSystem,
    ) {}

    public async writeLine(value: string): Promise<this> {
        if (this._fileCapacity <= 0) {
            return this;
        }

        if (this._disposed) {
            throw new Error('This instance has been disposed.');
        }

        if (!this._fileStream) {
            const stream = this.safeCreateStream(this._mainFile);
            if (!stream) {
                return this;
            }

            this._fileStream = stream;
        } else if (this._count >= this._fileCapacity) {
            this._fileStream.close();
            this.safeMoveMainToFallback();
            this._count = 0;

            const stream = this.safeCreateStream(this._mainFile);
            if (!stream) {
                return this;
            }

            this._fileStream = stream;
        }

        await this.safeWriteAsync(this._fileStream, value + '\n');
        this._count++;

        return this;
    }

    private safeWriteAsync(fs: WritableStream, data: string) {
        return new Promise<boolean>((resolve) => fs.write(data, (err) => (err ? resolve(false) : resolve(true))));
    }

    public dispose() {
        this._fileStream?.close();
        this._disposed = true;
    }

    private safeCreateStream(path: string) {
        try {
            return this._fileSystem.createWriteStream(path);
        } catch {
            return undefined;
        }
    }

    private safeMoveMainToFallback() {
        try {
            this._fileSystem.renameSync(this._mainFile, this._fallbackFile);
            return true;
        } catch {
            return false;
        }
    }
}
