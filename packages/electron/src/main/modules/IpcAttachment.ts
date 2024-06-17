import { BacktraceAttachment } from '@backtrace/sdk-core';
import { Readable } from 'stream';
import { IpcTransport } from '../../common';
import { ReadableIpcStream } from '../ipc/ReadableIpcStream';

export class IpcAttachment implements BacktraceAttachment {
    constructor(
        public readonly name: string,
        private readonly _id: string,
        private readonly _ipc: IpcTransport,
    ) {}

    public get(): Readable {
        return new ReadableIpcStream(this._id, this._ipc);
    }
}
