import fs from 'fs';

export class AlternatingFileWriter {
    private _fileStream?: fs.WriteStream;
    private _count = 0;
    private _disposed = false;

    constructor(
        private readonly _mainFile: string,
        private readonly _fallbackFile: string,
        private readonly _fileCapacity: number,
    ) {
        if (this._fileCapacity <= 0) {
            throw new Error('File capacity may not be less or equal to 0.');
        }
    }

    public async writeLine(value: string): Promise<this> {
        if (this._disposed) {
            throw new Error('This instance has been disposed.');
        }

        if (!this._fileStream) {
            this._fileStream = fs.createWriteStream(this._mainFile, 'utf-8');
        } else if (this._count >= this._fileCapacity) {
            this._fileStream.close();
            await fs.promises.rename(this._mainFile, this._fallbackFile);
            this._count = 0;
            this._fileStream = fs.createWriteStream(this._mainFile);
        }

        await this.writeAsync(this._fileStream, value + '\n');
        this._count++;

        return this;
    }

    private writeAsync(fs: fs.WriteStream, data: unknown) {
        return new Promise<void>((resolve, reject) => fs.write(data, (err) => (err ? reject(err) : resolve())));
    }

    public dispose() {
        this._fileStream?.close();
        this._disposed = true;
    }
}
