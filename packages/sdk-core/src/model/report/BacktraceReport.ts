import { BacktraceAttachment } from './BacktraceAttachment';

export interface BacktraceReport {
    attributes(): Record<string, unknown>;
    attachments(): BacktraceAttachment[];
    toDate(): Record<string, unknown>;
}
