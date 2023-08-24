import { BacktraceAttachment } from '@backtrace-labs/sdk-core';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

export class BacktraceFileAttachment implements BacktraceAttachment<Readable> {
    public readonly name: string;
    constructor(public readonly filePath: string) {
        this.name = path.basename(this.filePath);
    }

    public get(): fs.ReadStream | undefined {
        if (!fs.existsSync(this.filePath)) {
            return undefined;
        }
        return fs.createReadStream(this.filePath);
    }
}
