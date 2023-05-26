export type BacktraceInMemoryAttachment = {
    /**
     * Attachment name
     */
    name: string;
    /**
     * Attachment data
     */
    data: string;
};

export type BacktraceFileAttachment = string;
export type BacktraceAttachment = BacktraceInMemoryAttachment | BacktraceFileAttachment;
