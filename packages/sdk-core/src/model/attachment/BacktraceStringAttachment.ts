import { BacktraceAttachment } from './BacktraceAttachment';

export class BacktraceStringAttachment implements BacktraceAttachment<string> {
    constructor(public readonly name: string, public readonly data: string) {}

    public get(): string {
        return this.data;
    }
}
