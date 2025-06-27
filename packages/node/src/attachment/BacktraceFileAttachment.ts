import { BacktraceSyncStorage, BacktraceFileAttachment as CoreBacktraceFileAttachment } from '@backtrace/sdk-core';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { BacktraceStreamStorage } from '../storage/BacktraceStorage.js';

export class BacktraceFileAttachment implements CoreBacktraceFileAttachment<Readable> {
    public readonly name: string;

    constructor(
        public readonly filePath: string,
        name?: string,
        private readonly _fs: typeof fs | (BacktraceSyncStorage & BacktraceStreamStorage) = fs,
    ) {
        this.name = name ?? path.basename(this.filePath);
    }

    public get(): Readable | undefined {
        if ('hasSync' in this._fs) {
            if (!this._fs.hasSync(this.filePath)) {
                return undefined;
            }
        } else {
            if (!this._fs.existsSync(this.filePath)) {
                return undefined;
            }
        }

        return this._fs.createReadStream(this.filePath);
    }
}
