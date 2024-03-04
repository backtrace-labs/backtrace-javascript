import { BacktraceAttachment } from '../../../model/attachment';
import { LimitedRawBreadcrumb, RawBreadcrumb } from '../model/RawBreadcrumb';

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
     */
    getAttachments(): BacktraceAttachment[];
}
