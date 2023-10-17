import { ReactNativeFileSystem } from '../storage';
import { type StreamWriter } from '../storage/StreamWriter';

export class AlternatingFileWriter {
    private _streamId?: string;
    private _count = 0;
    private _disposed = false;

    private readonly _streamWriter: StreamWriter;

    private readonly _logQueue: string[] = [];

    private _currentAppendedLog?: string;

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

    public writeLine(value: string) {
        if (this._disposed) {
            throw new Error('This instance has been disposed.');
        }

        this._logQueue.push(value);
        if (!this._currentAppendedLog) {
            this.process();
        }
    }

    private process() {
        this._currentAppendedLog = this._logQueue.shift();

        if (!this._currentAppendedLog) {
            return;
        }

        this.prepareBreadcrumbStream();

        if (!this._streamId) {
            this._logQueue.unshift(this._currentAppendedLog);
            this._currentAppendedLog = undefined;
            return;
        }

        // if the queue is full and we can save more item in a batch
        // try to save as much as possible to speed up potential native operations
        this._count += 1;
        const logsToAppend = [this._currentAppendedLog];

        const restAppendingLogs = this._logQueue.splice(0, this._fileCapacity - this._count);
        this._count = this._count + restAppendingLogs.length;
        logsToAppend.push(...restAppendingLogs);

        this._streamWriter
            .append(this._streamId, logsToAppend.join('\n') + '\n')
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

    private prepareBreadcrumbStream() {
        if (!this._streamId) {
            this._streamId = this._streamWriter.create(this._mainFile);
        } else if (this._count >= this._fileCapacity) {
            const closeResult = this._streamWriter.close(this._streamId);
            if (!closeResult) {
                return;
            }
            this._streamId = undefined;

            const renameResult = this._reactNativeFileSystem.copySync(this._mainFile, this._fallbackFile);
            if (!renameResult) {
                return;
            }
            this._streamId = this._streamWriter.create(this._mainFile);

            this._count = 0;
        }
    }

    public dispose() {
        if (this._streamId) {
            this._streamWriter.close(this._streamId);
        }
        this._disposed = true;
    }
}
