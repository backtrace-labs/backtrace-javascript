import { BacktraceAttachment } from './BacktraceAttachment';

export interface BacktraceReport {
    attributes(): Record<string, any>;
    attachments(): BacktraceAttachment[];
    toDate(): Record<string, any>;
}
