import { BacktraceFileAttachment as CoreBacktraceFileAttachment } from '@backtrace/sdk-core';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

export class BacktraceFileAttachment implements CoreBacktraceFileAttachment<Readable> {
    public readonly name: string;

    constructor(
        public readonly filePath: string,
        name?: string,
    ) {
        this.name = name ?? path.basename(this.filePath);
    }

    public get(): fs.ReadStream | undefined {
        if (!fs.existsSync(this.filePath)) {
            return undefined;
        }
        return fs.createReadStream(this.filePath);
    }
}
