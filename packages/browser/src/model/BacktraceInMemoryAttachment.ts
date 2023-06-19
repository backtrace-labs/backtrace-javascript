import { BacktraceAttachment } from '@backtrace/sdk-core';

export class BacktraceInMemoryAttachment implements BacktraceAttachment<Uint8Array> {
    constructor(public readonly name: string, public readonly data: Uint8Array) {}

    public get(): Uint8Array {
        return this.data;
    }
}
