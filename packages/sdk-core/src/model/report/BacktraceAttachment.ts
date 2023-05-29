export interface BacktraceInMemoryAttachment {
    /**
     * Attachment name
     */
    name: string;
    /**
     * Attachment data
     */
    data: Uint8Array;
}

export type BacktraceFileAttachment = string;
export type BacktraceAttachment = BacktraceInMemoryAttachment | BacktraceFileAttachment;
