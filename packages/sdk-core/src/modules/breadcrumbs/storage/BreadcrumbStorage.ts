import { BacktraceAttachment } from '../../../model/attachment';
import { AttributeType } from '../../../model/data/BacktraceData';
import { BreadcrumbLogLevel } from '../model/BreadcrumbLogLevel';
import { BreadcrumbType } from '../model/BreadcrumbType';

export interface BreadcrumbStorage extends BacktraceAttachment {
    /**
     * Id of the last breadcrumb added to the SDK
     */
    get lastBreadcrumbId(): number;

    /**
     * Adds breadcrumb to the storage
     * @param message message
     * @param level log level
     * @param type type
     * @param attributes attributes
     */
    add(
        message: string,
        level: BreadcrumbLogLevel,
        type: BreadcrumbType,
        attributes?: Record<string, AttributeType>,
    ): number;
}
