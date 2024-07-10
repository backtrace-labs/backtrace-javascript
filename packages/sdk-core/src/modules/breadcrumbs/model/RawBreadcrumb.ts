import { Limited } from '../../../common/limitObjectDepth';
import { AttributeType } from '../../../model/data';
import { BreadcrumbLogLevel } from './BreadcrumbLogLevel';
import { BreadcrumbType } from './BreadcrumbType';

export interface RawBreadcrumb {
    message: string;
    level: BreadcrumbLogLevel;
    type: BreadcrumbType;
    attributes?: Record<string, AttributeType>;
}

export interface LimitedRawBreadcrumb {
    message: string;
    level: BreadcrumbLogLevel;
    type: BreadcrumbType;
    attributes?: Limited<Record<string, AttributeType>>;
}
