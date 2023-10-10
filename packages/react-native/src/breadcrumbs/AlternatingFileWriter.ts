import { ReactNativeFileSystem } from '../storage';
import { StreamWriter } from '../storage/StreamWriter';

export class AlternatingFileWriter {
    private _streamId?: string;
    private _count = 0;
    private _disposed = false;

    private readonly _streamWriter: StreamWriter;

    constructor(
        private readonly _mainFile: string,
        private readonly _fallbackFile: string,
        private readonly _fileCapacity: number,
        private readonly _reactNativeFileSystem: ReactNativeFileSystem,
    ) {
        if (this._fileCapacity <= 0) {
            throw new Error('File capacity may not be less or equal to 0.');
        }
        this._streamWriter = this._reactNativeFileSystem.streamWriter;
    }

    public async writeLine(value: string): Promise<this> {
        if (this._disposed) {
            throw new Error('This instance has been disposed.');
        }
        if (!this._streamId) {
            this._streamId = this._streamWriter.create(this._mainFile);
        } else if (this._count >= this._fileCapacity) {
            this._streamWriter.close(this._streamId);
            this._count = 0;
            this._reactNativeFileSystem.renameSync(this._mainFile, this._fallbackFile);
            this._streamId = this._streamWriter.create(this._mainFile);
        }
        this._streamWriter.append(this._streamId, value + '\n');
        this._count++;

        return this;
    }

    public dispose() {
        if (this._streamId) {
            this._streamWriter.close(this._streamId);
        }
        this._disposed = true;
    }
}
