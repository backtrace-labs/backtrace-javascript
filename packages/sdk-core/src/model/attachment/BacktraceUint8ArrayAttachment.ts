import { BacktraceAttachment } from './BacktraceAttachment';

export class BacktraceUint8ArrayAttachment implements BacktraceAttachment<Blob> {
    constructor(
        public readonly name: string,
        public readonly data: Uint8Array,
    ) {}

    public get(): Blob {
        return new Blob([this.data.buffer]);
    }
}
