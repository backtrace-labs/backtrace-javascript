export interface BacktraceAttachment<T = unknown> {
    /**
     * Attachment name
     */
    readonly name: string;

    /**
     * Attachment data
     */
    get(): T | undefined;
}
