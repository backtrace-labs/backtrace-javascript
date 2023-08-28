import { BacktraceAttachment } from '../../../model/attachment';
import { RawBreadcrumb } from '../model/RawBreadcrumb';

export interface BreadcrumbsStorage extends BacktraceAttachment {
    /**
     * Id of the last breadcrumb added to the SDK
     */
    get lastBreadcrumbId(): number;

    /**
     * Adds breadcrumb to the storage
     * @param rawBreadcrumb breadcrumb data
     */
    add(rawBreadcrumb: RawBreadcrumb): number;
}
