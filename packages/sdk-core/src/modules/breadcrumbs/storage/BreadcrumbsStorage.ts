import { BacktraceAttachment } from '../../../model/attachment/index.js';
import { BacktraceAttachmentProvider } from '../../attachments/BacktraceAttachmentProvider.js';
import { LimitedRawBreadcrumb, RawBreadcrumb } from '../model/RawBreadcrumb.js';

export interface BreadcrumbsStorageOptions {
    readonly limits: BreadcrumbsStorageLimits;
}

export interface BreadcrumbsStorageLimits {
    /**
     * Specifies maximum number of breadcrumbs stored by the storage. By default, only 100 breadcrumbs
     * will be stored.
     */
    readonly maximumBreadcrumbs?: number;

    /**
     * Specifies maximum breadcrumbs size in bytes.
     * If the size is exceeded, oldest breadcrumbs will be skipped.
     */
    readonly maximumTotalBreadcrumbsSize?: number;
}

export type BreadcrumbsStorageFactory = (options: BreadcrumbsStorageOptions) => BreadcrumbsStorage;

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
