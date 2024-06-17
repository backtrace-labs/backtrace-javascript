import { BacktraceAttachment } from '@backtrace/sdk-core';

export class BacktraceBufferAttachment implements BacktraceAttachment<Buffer> {
    constructor(
        public readonly name: string,
        public readonly buffer: Buffer,
    ) {}
    public get(): Buffer {
        return this.buffer;
    }
}
