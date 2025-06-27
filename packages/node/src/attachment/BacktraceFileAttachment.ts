import { BacktraceAttachment } from '@backtrace/sdk-core';
import nodeFs from 'fs';
import path from 'path';
import { Readable } from 'stream';

export class BacktraceFileAttachment implements BacktraceAttachment<Readable> {
    public readonly name: string;

    constructor(
        public readonly filePath: string,
        name?: string,
        private readonly _fs: typeof nodeFs = nodeFs,
    ) {
        this.name = name ?? path.basename(this.filePath);
    }

    public get(): Readable | undefined {
        if (!this._fs.existsSync(this.filePath)) {
            return undefined;
        }

        return this._fs.createReadStream(this.filePath);
    }
}

export interface BacktraceFileAttachmentFactory {
    create(filePath: string, name?: string): BacktraceFileAttachment;
}

export class NodeFsBacktraceFileAttachmentFactory implements BacktraceFileAttachmentFactory {
    constructor(private readonly _fs: typeof nodeFs = nodeFs) {}

    public create(filePath: string, name?: string): BacktraceFileAttachment {
        return new BacktraceFileAttachment(filePath, name, this._fs);
    }
}
