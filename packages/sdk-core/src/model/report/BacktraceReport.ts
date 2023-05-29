import { BacktraceAttachment } from './BacktraceAttachment';

export interface BacktraceReport {
    attributes(): Record<string, unknown>;
    attachments(): BacktraceAttachment[];
    toData(): Record<string, unknown>;
}
