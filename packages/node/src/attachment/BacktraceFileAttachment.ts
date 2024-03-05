import { BacktraceFileAttachment as CoreBacktraceFileAttachment } from '@backtrace/sdk-core';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { NodeFileSystem } from '../storage/interfaces/NodeFileSystem';

export class BacktraceFileAttachment implements CoreBacktraceFileAttachment<Readable> {
    public readonly name: string;

    constructor(
        public readonly filePath: string,
        name?: string,
        private readonly _fileSystem?: NodeFileSystem,
    ) {
        this.name = name ?? path.basename(this.filePath);
    }

    public get(): Readable | undefined {
        if (!(this._fileSystem ?? fs).existsSync(this.filePath)) {
            return undefined;
        }
        return (this._fileSystem ?? fs).createReadStream(this.filePath);
    }
}
