import { BacktraceAttachment } from '../../model/attachment/index.js';

export interface BacktraceAttachmentProvider {
    /**
     * Return attachment provider type. Based on the type, attachment provider is being invoked
     * once or per every report.
     * - scoped: means the attachment provider will be invoked only once just after adding the
     *  provider to the client.
     * - dynamic: means the attachment provider will be invoked every time before the report data generation
     */
    get type(): 'scoped' | 'dynamic';

    /**
     * Generate provider attributes
     */
    get(): BacktraceAttachment;
}
