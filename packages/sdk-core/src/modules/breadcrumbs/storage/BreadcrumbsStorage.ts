import { BacktraceAttachment } from '../../../model/attachment';
import { BacktraceAttachmentProvider } from '../../attachments/BacktraceAttachmentProvider';
import { RawBreadcrumb } from '../model/RawBreadcrumb';

export interface BreadcrumbsStorage {
    /**
     * Id of the last breadcrumb added to the SDK
     */
    get lastBreadcrumbId(): number;

    /**
     * Adds breadcrumb to the storage
     * @param rawBreadcrumb breadcrumb data
     */
    add(rawBreadcrumb: RawBreadcrumb): number;

    /**
     * Gets attachments associated with this storage.
     * @deprecated Use `getAttachmentProviders`.
     */
    getAttachments(): BacktraceAttachment[];

    /**
     * Gets attachments providers associated with this storage.
     */
    getAttachmentProviders?(): BacktraceAttachmentProvider[];
}
