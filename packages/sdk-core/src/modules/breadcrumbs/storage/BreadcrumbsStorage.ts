import { BacktraceAttachment } from '../../../model/attachment';
import { LimitedRawBreadcrumb, RawBreadcrumb } from '../model/RawBreadcrumb';

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
    readonly maximumBreadcrumbsSize?: number;
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
     */
    getAttachments(): BacktraceAttachment[];
}
