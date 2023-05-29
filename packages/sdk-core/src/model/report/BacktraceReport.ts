import { BacktraceAttachment } from './BacktraceAttachment';

export interface BacktraceReport {
    readonly attributes: Record<string, unknown>;
    readonly attachments: BacktraceAttachment[];
    toData(): Record<string, unknown>;
}
