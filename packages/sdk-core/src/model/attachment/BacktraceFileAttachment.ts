import { BacktraceAttachment } from './BacktraceAttachment';

export interface BacktraceFileAttachment<T = unknown> extends BacktraceAttachment<T> {
    /**
     * File path to attachment.
     */
    readonly filePath: string;
}
