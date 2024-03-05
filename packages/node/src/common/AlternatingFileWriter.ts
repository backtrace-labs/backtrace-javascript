import { Writable } from 'stream';
import { NodeFileSystem } from '../storage/interfaces/NodeFileSystem.js';

export class AlternatingFileWriter {
    private _fileStream?: Writable;
    private _count = 0;
    private _size = 0;
    private _disposed = false;

    private readonly _logQueue: string[] = [];
    private _currentAppendedLog?: string;

    constructor(
        private readonly _fileSystem: NodeFileSystem,
        private readonly _mainFile: string,
        private readonly _fallbackFile: string,
        private readonly _maxLines?: number,
        private readonly _maxSize?: number,
    ) {}

    public async writeLine(value: string): Promise<void> {
        if (this._disposed) {
            throw new Error('This instance has been disposed.');
        }

        this._logQueue.push(value);
        if (!this._currentAppendedLog) {
            return await this.process();
        }
    }

    private async process(): Promise<void> {
        this._currentAppendedLog = this._logQueue.shift();

        if (!this._currentAppendedLog) {
            return;
        }

        const appendLength = this._currentAppendedLog.length + 1;
        this.prepareBreadcrumbStream(appendLength);

        if (!this._fileStream) {
            this._logQueue.unshift(this._currentAppendedLog);
            this._currentAppendedLog = undefined;
            return;
        }

        // if the queue is full and we can save more item in a batch
        // try to save as much as possible to speed up potential native operations
        this._count += 1;
        this._size += appendLength;

        const logsToAppend = [this._currentAppendedLog];

        let logsToTake = 0;
        let currentCount = this._count;
        let currentSize = this._size;

        for (let i = 0; i < this._logQueue.length; i++) {
            const log = this._logQueue[i];
            if (!log) {
                continue;
            }

            const logLength = log.length + 1;

            if (currentCount + 1 > (this._maxLines ?? Infinity)) {
                break;
            }

            if (currentSize + logLength >= (this._maxSize ?? Infinity)) {
                break;
            }

            logsToTake++;
            currentCount++;
            currentSize += logLength;
        }

        const restAppendingLogs = this._logQueue.splice(0, logsToTake);
        this._count = this._count + restAppendingLogs.length;
        this._size += restAppendingLogs.reduce((sum, l) => sum + l.length + 1, 0);

        logsToAppend.push(...restAppendingLogs);

        return await this.writeAsync(this._fileStream, logsToAppend.join('\n') + '\n')
            .catch(() => {
                // handle potential issues with appending logs.
                // we can't do really too much here other than retry
                // logging the error might also cause a breadcrumb loop, that we should try to avoid
                this._logQueue.unshift(...logsToAppend);
            })
            .finally(() => {
                if (this._logQueue.length !== 0) {
                    return this.process();
                } else {
                    this._currentAppendedLog = undefined;
                }
            });
    }

    private writeAsync(fs: Writable, data: string) {
        return new Promise<void>((resolve, reject) => fs.write(data, (err) => (err ? reject(err) : resolve())));
    }

    private prepareBreadcrumbStream(newSize: number) {
        if (!this._fileStream) {
            this._fileStream = this.safeCreateStream(this._mainFile);
        } else if (this._count >= (this._maxLines ?? Infinity) || this._size + newSize >= (this._maxSize ?? Infinity)) {
            this.switchFile();
        }
    }

    private switchFile() {
        if (this._fileStream) {
            this._fileStream.destroy();
        }

        this._fileStream = undefined;

        const renameResult = this.safeMoveMainToFallback();
        if (!renameResult) {
            return;
        }

        this._fileStream = this.safeCreateStream(this._mainFile);

        this._count = 0;
        this._size = 0;
    }

    public dispose() {
        this._fileStream?.destroy();
        this._disposed = true;
    }

    private safeMoveMainToFallback() {
        try {
            this._fileSystem.renameSync(this._mainFile, this._fallbackFile);
            return true;
        } catch {
            return false;
        }
    }

    private safeCreateStream(path: string) {
        try {
            return this._fileSystem.createWriteStream(path);
        } catch {
            return undefined;
        }
    }
}
