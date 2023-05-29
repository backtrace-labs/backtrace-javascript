import { BacktraceAttachment } from './BacktraceAttachment';

export interface BacktraceReport {
    get attributes(): Record<string, unknown>;
    get attachments(): BacktraceAttachment[];
    toData(): Record<string, unknown>;
}
