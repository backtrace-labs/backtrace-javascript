import { BacktraceAttachment } from '../../../model/attachment/index.js';
import { BacktraceAttachmentProvider } from '../../attachments/BacktraceAttachmentProvider.js';
import { LimitedRawBreadcrumb, RawBreadcrumb } from '../model/RawBreadcrumb.js';

export interface BreadcrumbsStorage {
    /**
     * Id of the last breadcrumb added to the SDK
     */
    get lastBreadcrumbId(): number;

    /**
     * Adds breadcrumb to the storage
     * @param rawBreadcrumb breadcrumb data
     */
    add(rawBreadcrumb: RawBreadcrumb | LimitedRawBreadcrumb): number;

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
