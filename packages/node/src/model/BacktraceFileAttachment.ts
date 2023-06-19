import { BacktraceAttachment } from '@backtrace/sdk-core';
import fs from 'fs';
import path from 'path';

export class BacktraceFileAttachment implements BacktraceAttachment<fs.ReadStream> {
    public readonly name: string;
    constructor(private readonly _filePath: string) {
        this.name = path.basename(this._filePath);
    }

    public get(): fs.ReadStream | undefined {
        if (!fs.existsSync(this._filePath)) {
            return undefined;
        }
        return fs.createReadStream(this._filePath);
    }
}
